import { useState } from "react";

const API = "http://localhost:8080/api/search";

function App() {
  const [query, setQuery] = useState("");
  const [productName, setProductName] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [combineResult, setCombineResult] = useState(null);
  const [loading, setLoading] = useState({ search: false, combine: false });
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading((l) => ({ ...l, search: true }));
    setError("");
    setSearchResults(null);
    try {
      const res = await fetch(`${API}/analyze?query=${encodeURIComponent(query)}`);
      const text = await res.text();
      const parsed = JSON.parse(text);
      setSearchResults(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (e) {
      setError("Arama hatası: " + e.message);
    } finally {
      setLoading((l) => ({ ...l, search: false }));
    }
  };

  const handleCombine = async () => {
    if (!productName.trim()) return;
    setLoading((l) => ({ ...l, combine: true }));
    setError("");
    setCombineResult(null);
    try {
      const res = await fetch(`${API}/combine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      });
      const text = await res.text();
      setCombineResult(JSON.parse(text));
    } catch (e) {
      setError("Combine hatası: " + e.message);
    } finally {
      setLoading((l) => ({ ...l, combine: false }));
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ borderBottom: "2px solid #6366f1", paddingBottom: 10 }}>
        🛍️ ShoppingAI
      </h1>

      {/* ÜRÜN ARAMA */}
      <section style={card}>
        <h2>🔍 Ürün Ara</h2>
        <p style={hint}>Ne aradığını yaz, tüm e-ticaret sitelerinde karşılaştırma yapılsın.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='örn: "beyaz spor ayakkabı" veya "yazlık elbise"'
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button style={btn("#6366f1")} onClick={handleSearch} disabled={loading.search}>
            {loading.search ? "⏳ Aranıyor..." : "Ara"}
          </button>
        </div>

        {searchResults && (
          <div style={{ marginTop: 16 }}>
            {searchResults.map((p, i) => (
              <div key={i} style={productCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{p.site}</div>
                    {p.rating && <div style={{ fontSize: 13, marginTop: 2 }}>⭐ {p.rating}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: "#6366f1" }}>{p.price}</div>
                    {p.url && p.url !== "N/A" && (
                      <a href={p.url} target="_blank" rel="noreferrer" style={linkBtn}>
                        Siteye Git →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* KOMBİN ÖNER */}
      <section style={card}>
        <h2>👗 Kombin Öner</h2>
        <p style={hint}>Bir ürün adı gir, ona uygun kombin önerilsin.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={input}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder='örn: "beyaz keten pantolon"'
            onKeyDown={(e) => e.key === "Enter" && handleCombine()}
          />
          <button style={btn("#10b981")} onClick={handleCombine} disabled={loading.combine}>
            {loading.combine ? "⏳ Hazırlanıyor..." : "Kombin Al"}
          </button>
        </div>
        {combineResult?.combination && (
          <div style={{ marginTop: 16 }}>
            {combineResult.combination.map((c, i) => (
              <div key={i} style={productCard}>
                <b>#{i + 1} {c.item}</b>
                <div style={{ color: "#555", fontSize: 14, marginTop: 4 }}>{c.tip}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <div style={errorBox}>⚠️ {error}</div>}
    </div>
  );
}

const card = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 20 };
const productCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 10 };
const input = { flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 15 };
const hint = { color: "#64748b", fontSize: 13, marginTop: -8, marginBottom: 12 };
const errorBox = { background: "#fee2e2", color: "#dc2626", padding: 12, borderRadius: 8 };
const linkBtn = { display: "inline-block", marginTop: 6, fontSize: 13, color: "#6366f1", textDecoration: "none", fontWeight: 600 };
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" });

export default App;