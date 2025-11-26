from flask import Flask, render_template, request, jsonify
import networkx as nx

app = Flask(__name__)


# ---------- Core logic ----------
def unique_preserve_order(seq):
    seen = set()
    out = []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def parse_words(text: str):
    if not text:
        return []
    for sep in [",", "\n", "\r", "\t"]:
        text = text.replace(sep, " ")
    words = [w.strip().upper() for w in text.split(" ") if w.strip()]
    return words


def verify_uniform_and_metadata(words):
    if not words:
        raise ValueError("Please enter at least one word.")
    lens = {len(w) for w in words}
    if len(lens) != 1:
        raise ValueError(f"All words must have the same length; got lengths: {sorted(lens)}")
    n = lens.pop()
    words = unique_preserve_order(words)
    alphabet = sorted(set("".join(words)))
    return words, n, alphabet


def build_graph(words):
    n = len(words[0])
    G = nx.DiGraph()
    for w in words:
        for i in range(1, n):
            prefix = w[:i]
            suffix = w[i:]
            G.add_node(prefix, layer=len(prefix))
            G.add_node(suffix, layer=len(suffix))
            G.add_edge(prefix, suffix, word=w, split=i)
    return G


def is_circular(G):
    # Circular <=> G is a DAG (no cycles, including 2-cycles or self-loops)
    return nx.is_directed_acyclic_graph(G)


def longest_paths_in_dag(G, max_paths=2000):
    if not nx.is_directed_acyclic_graph(G):
        return None, []
    topo = list(nx.topological_sort(G))
    dist = {v: 0 for v in topo}
    parents = {v: set() for v in topo}
    for u in topo:
        for v in G.successors(u):
            cand = dist[u] + 1
            if cand > dist[v]:
                dist[v] = cand
                parents[v] = {u}
            elif cand == dist[v]:
                parents[v].add(u)
    L = max(dist.values())
    ends = [v for v in topo if dist[v] == L]
    paths = []

    def backtrack(v, acc):
        if len(paths) >= max_paths:
            return
        if dist[v] == 0:
            paths.append(list(reversed(acc + [v])))
            return
        for p in sorted(parents[v]):
            backtrack(p, acc + [v])

    for e in sorted(ends):
        backtrack(e, [])
        if len(paths) >= max_paths:
            break
    return L, paths


def analyze_code_text(raw_text: str):
    words = parse_words(raw_text)
    words, n, alphabet = verify_uniform_and_metadata(words)

    G = build_graph(words)
    circular = is_circular(G)

    cycle_edges = set()
    if circular:
        L, paths = longest_paths_in_dag(G)
        if L == 1:
            classification = "code strong comma-free"
        elif L == 2:
            classification = "code comma-free"
        else:
            classification = "(no special label)"
    else:
        L, paths, classification = None, [], None
        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                for i in range(len(cycle)):
                    u = cycle[i]
                    v = cycle[(i + 1) % len(cycle)]
                    cycle_edges.add((u, v))
        except Exception:
            pass

    # Build Cytoscape elements (nodes + directed edges)
    elements = []
    for node, data_attr in G.nodes(data=True):
        elements.append({
            "data": {"id": node, "label": node, "layer": int(data_attr.get("layer", 1))}
        })
    for u, v, d in G.edges(data=True):
        is_in_cycle = (u, v) in cycle_edges
        elements.append({
            "data": {
                "source": u,
                "target": v,
                "label": f"{d.get('word')}|i={d.get('split')}",
                "cycle": is_in_cycle
            }
        })

    summary_lines = [
        "Code (set): {" + ", ".join(words) + "}",
        "Alphabet: {" + ", ".join(alphabet) + "}",
        f"Number of words: {len(words)}",
        f"Word length: {n}",
        "",
    ]
    if circular:
        summary_lines += [
            "Circularity: code is CIRCULAR (graph is acyclic).",
            f"Longest path length: {L}",
            f"Classification: {classification}",
            "Longest path(s):"
        ] + [" -> ".join(p) for p in paths]
    else:
        summary_lines += ["Circularity: code is NOT circular (graph has a directed cycle)."]

    return {
        "summary": "\n".join(summary_lines),
        "elements": elements,
        "circular": circular
    }


# ---------- Flask routes ----------
@app.get("/")
def index():
    return render_template("index.html")


@app.post("/analyze")
def analyze():
    try:
        data = request.get_json(force=True)
        text = (data or {}).get("text", "")
        payload = analyze_code_text(text)
        return jsonify({"ok": True, **payload})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.post("/analyze-file")
def analyze_file():
    try:
        if "file" not in request.files:
            raise ValueError("No file uploaded.")
        uploaded = request.files["file"]
        raw = uploaded.read()
        if not raw:
            raise ValueError("Uploaded file is empty.")
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("Please upload a UTF-8 text file.") from exc
        payload = analyze_code_text(text)
        return jsonify({"ok": True, **payload})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


if __name__ == "__main__":
    # Local development
    app.run(host="0.0.0.0", port=8080, debug=False)
