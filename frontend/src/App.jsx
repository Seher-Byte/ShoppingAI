import { useState, useEffect } from "react";

const API = "http://localhost:8080/api/search";

function App() {
  const [currentView, setCurrentView] = useState(
      window.location.hash.replace("#", "") || "home"
  );

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash.replace("#", "") || "home");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (view) => {
    window.location.hash = view;
  };

  const [query, setQuery] = useState("");
  const [productName, setProductName] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [combineResult, setCombineResult] = useState(null);
  const [loading, setLoading] = useState({ search: false, combine: false });
  const [error, setError] = useState("");
  const [sortType, setSortType] = useState("default");

  const parsePriceToNumber = (priceStr) => {
    if (!priceStr || priceStr === "Fiyat Yok" || priceStr === "Bulunamadı") return Infinity;
    let cleanStr = priceStr.replace(/[^0-9,]/g, "");
    cleanStr = cleanStr.replace(",", ".");
    return parseFloat(cleanStr) || Infinity;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading((l) => ({ ...l, search: true }));
    setError("");
    setSearchResults(null);
    setSortType("default");

    try {
      const res = await fetch(`${API}/analyze?query=${encodeURIComponent(query)}`);
      const text = await res.text();
      const parsed = JSON.parse(text);

      if (parsed.error) throw new Error(parsed.error);
      setSearchResults(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (e) {
      setError("Arama hatası: " + e.message);
    } finally {
      setLoading((l) => ({ ...l, search: false }));
    }
  };

  const displayedResults = searchResults ? [...searchResults].sort((a, b) => {
    if (sortType === "asc") return parsePriceToNumber(a.price) - parsePriceToNumber(b.price);
    if (sortType === "desc") return parsePriceToNumber(b.price) - parsePriceToNumber(a.price);
    return 0;
  }) : null;

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
      const parsed = JSON.parse(text);
      if (parsed.error) throw new Error(parsed.error);
      setCombineResult(parsed);
    } catch (e) {
      setError("Kombin hatası: " + e.message);
    } finally {
      setLoading((l) => ({ ...l, combine: false }));
    }
  };

  return (
      <div className="app-layout">
        <style>{`
        /* LÜKS KOYU TEMA (Dark Elite) */
        :root {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          --bg-color: #1a1a1a;       /* Koyu Gri / Antrasit Arka Plan */
          --surface-color: #242424;  /* Kartlar ve Menü İçin Bir Ton Açık Gri */
          --border-color: #333333;   /* İnce Çizgiler İçin Koyu Gri */
          --text-main: #ffffff;      /* Ana Metinler Beyaz */
          --text-muted: #a3a3a3;     /* Alt Metinler Gri */
          --gold: #d4af37;           /* Klasik Lüks Altın Rengi */
          --gold-hover: #b5952f;
          --gold-light: rgba(212, 175, 55, 0.1); /* Seçili menü arka planı */
        }
        body, html { margin: 0; padding: 0; height: 100%; background: var(--bg-color); color: var(--text-main); font-weight: 400; }
        
        .app-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background-color: var(--bg-color);
        }

        /* YAN MENÜ */
        .sidebar {
          width: 280px;
          background: var(--surface-color);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 10;
          box-shadow: 2px 0 15px rgba(0,0,0,0.5);
        }
        .logo-area {
          padding: 2.5rem 2rem;
          text-align: center;
          border-bottom: 1px solid var(--border-color);
        }
        .logo-area h1 {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 300;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--text-main);
        }
        .logo-area span {
          color: var(--gold);
          font-weight: 700;
        }
        .menu-items {
          padding: 2rem 0;
          display: flex;
          flex-direction: column;
        }
        .menu-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 1.5rem 2.5rem;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
          display: flex;
          align-items: center;
        }
        .menu-btn:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.03);
        }
        .menu-btn.active {
          color: var(--gold);
          border-left: 4px solid var(--gold);
          background: var(--gold-light);
          font-weight: 700;
        }

        /* ANA İÇERİK (TAM EKRAN YAYILIMI) */
        .main-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
          background: var(--bg-color);
        }
        .page-container {
          padding: 3rem 5rem;
          width: 100%;
          box-sizing: border-box;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* ANA SAYFA HERO (MODA DERGİSİ KONSEPTİ) */
        .home-hero {
          height: 100vh;
          background-image: linear-gradient(to right, rgba(26, 26, 26, 1) 0%, rgba(26, 26, 26, 0.4) 100%), url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1920&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 10%;
        }
        .home-hero h2 {
          font-size: 4.5rem;
          margin: 0 0 1rem 0;
          line-height: 1.1;
          font-weight: 300;
          letter-spacing: -1px;
          color: var(--text-main);
        }
        .home-hero span { color: var(--gold); }
        .home-hero p {
          font-size: 1.2rem;
          max-width: 500px;
          margin-bottom: 3rem;
          color: #cccccc;
          line-height: 1.6;
        }
        .action-cards {
          display: flex;
          gap: 2rem;
        }
        .action-card {
          background: rgba(36, 36, 36, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          padding: 2.5rem;
          cursor: pointer;
          transition: 0.4s;
          flex: 1;
          max-width: 300px;
          position: relative;
          overflow: hidden;
        }
        .action-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: var(--gold);
          transform: translateY(100%);
          transition: transform 0.4s ease;
          z-index: 0;
        }
        .action-card:hover { border-color: var(--gold); }
        .action-card:hover::before { transform: translateY(0); }
        .action-card:hover h3, .action-card:hover p { color: #1a1a1a; }
        .action-card h3, .action-card p {
          position: relative;
          z-index: 1;
          transition: color 0.4s;
        }
        .action-card h3 { margin: 0 0 1rem 0; font-size: 1.2rem; text-transform: uppercase; letter-spacing: 1px; color: var(--gold); }
        .action-card p { color: var(--text-muted); font-size: 0.95rem; }

        /* ARAMA VE GİRİŞ KUTULARI */
        .header-box { margin-bottom: 3rem; }
        .header-box h2 {
          margin: 0 0 0.5rem 0;
          font-size: 2.2rem;
          font-weight: 300;
          color: var(--text-main);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .header-box p { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 2.5rem; }
        
        .search-row {
          display: flex;
          gap: 1.5rem;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 1rem;
          transition: border-color 0.3s;
        }
        .search-row:focus-within { border-color: var(--gold); }
        .input-stylish {
          flex: 1;
          padding: 0.5rem 0;
          font-size: 1.3rem;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text-main);
        }
        .input-stylish::placeholder { color: #555555; font-weight: 300; }
        .btn-stylish {
          background: var(--gold);
          color: #1a1a1a;
          border: none;
          padding: 0 3.5rem;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          transition: 0.3s;
        }
        .btn-stylish:hover:not(:disabled) { background: #e5c158; box-shadow: 0 0 15px rgba(212, 175, 55, 0.4); }
        .btn-stylish:disabled { background: #555555; color: #888888; cursor: not-allowed; box-shadow: none; }

        /* LÜKS GRID VE ÜRÜN KARTLARI */
        .filter-row { display: flex; justify-content: space-between; margin-bottom: 2.5rem; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;}
        .filter-row h3 { font-weight: 300; margin: 0; font-size: 1.1rem; color: var(--text-muted); }
        .custom-select { padding: 0.7rem 1rem; border: 1px solid var(--border-color); background: var(--surface-color); outline: none; font-size: 0.9rem; color: var(--text-main); cursor: pointer; }
        
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2.5rem;
          padding-bottom: 4rem;
        }
        .card {
          background: var(--surface-color);
          transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.4); border-color: var(--gold); }
        
        .card-img-wrap {
          height: 350px;
          background: #ffffff; /* Ürünlerin net görünmesi için içi beyaz */
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .card-img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .card-body { padding: 1.8rem; display: flex; flex-direction: column; flex: 1;}
        .badge { font-size: 0.75rem; color: #1a1a1a; background: var(--gold); padding: 4px 10px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; font-weight: 700; align-self: flex-start;}
        .card-title { font-size: 1.1rem; font-weight: 300; margin-bottom: 15px; color: var(--text-main); line-height: 1.5;}
        .card-tip { font-size: 0.9rem; color: #cccccc; margin-bottom: 20px; font-style: italic; border-left: 2px solid var(--gold); padding-left: 10px; }
        .card-price { font-size: 1.4rem; font-weight: 600; color: var(--gold); margin-top: auto;}
        
        .btn-link { display: block; background: transparent; color: var(--gold); border: 1px solid var(--gold); text-decoration: none; padding: 1rem; text-align: center; font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-top: 25px; transition: 0.3s;}
        .btn-link:hover { background: var(--gold); color: #1a1a1a;}

        .error-msg { background: rgba(220, 38, 38, 0.1); border-left: 3px solid #ef4444; color: #ef4444; padding: 1.2rem; font-size: 1rem; margin-bottom: 2rem; }
      `}</style>

        {/* YAN MENÜ */}
        <nav className="sidebar">
          <div className="logo-area">
            <h1>Shopping<span>AI</span></h1>
          </div>
          <div className="menu-items">
            <button
                className={`menu-btn ${currentView === "home" ? "active" : ""}`}
                onClick={() => navigateTo("home")}
            >
              Ana Sayfa
            </button>
            <button
                className={`menu-btn ${currentView === "search" ? "active" : ""}`}
                onClick={() => navigateTo("search")}
            >
              Kıyafet Keşfet
            </button>
            <button
                className={`menu-btn ${currentView === "combine" ? "active" : ""}`}
                onClick={() => navigateTo("combine")}
            >
              Kombin Yarat
            </button>
          </div>
        </nav>

        {/* ANA İÇERİK */}
        <main className="main-content">

          {/* ANA SAYFA */}
          {currentView === "home" && (
              <div className="home-hero">
                <h2>Kusursuz Seçim,<br/><span>Zarif Stil.</span></h2>
                <p>Aradığınız özel parçayı saniyeler içinde bulmak veya gardırobunuza elit bir dokunuş yapmak için yapay zekayı kullanın.</p>

                <div className="action-cards">
                  <div className="action-card" onClick={() => navigateTo("search")}>
                    <h3>Kıyafet Keşfet</h3>
                    <p>En özel parçaları bul.</p>
                  </div>
                  <div className="action-card" onClick={() => navigateTo("combine")}>
                    <h3>Kombin Yarat</h3>
                    <p>Kişisel AI stilistiniz.</p>
                  </div>
                </div>
              </div>
          )}

          {/* KIYAFET KEŞFET EKRANI */}
          {currentView === "search" && (
              <div className="page-container">
                <div className="header-box">
                  <h2>Kıyafet Keşfet</h2>
                  <p>Zarif bir arama deneyimi. Aradığınız parçayı girin.</p>

                  {error && <div className="error-msg">Hata: {error}</div>}

                  <div className="search-row">
                    <input
                        className="input-stylish"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Örn: Siyah ipek elbise..."
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button className="btn-stylish" onClick={handleSearch} disabled={loading.search}>
                      {loading.search ? "Aranıyor..." : "Keşfet"}
                    </button>
                  </div>
                </div>

                {displayedResults && (
                    <>
                      <div className="filter-row">
                        <h3>{displayedResults.length} Parça Bulundu</h3>
                        <select className="custom-select" value={sortType} onChange={(e) => setSortType(e.target.value)}>
                          <option value="default">Sıralama: Önerilen</option>
                          <option value="asc">Fiyat: Düşükten Yükseğe</option>
                          <option value="desc">Fiyat: Yüksekten Düşüğe</option>
                        </select>
                      </div>

                      <div className="product-grid">
                        {displayedResults.map((p, i) => (
                            <div key={i} className="card">
                              <div className="card-img-wrap">
                                {p.image ? <img src={p.image} alt={p.name} /> : <div style={{color:'#a3a3a3'}}>Görsel Yok</div>}
                              </div>
                              <div className="card-body">
                                <span className="badge">{p.site}</span>
                                <div className="card-title">{p.name}</div>
                                <div className="card-price">{p.price}</div>
                                {p.url && p.url !== "N/A" && (
                                    <a href={p.url} target="_blank" rel="noreferrer" className="btn-link">Ürünü İncele</a>
                                )}
                              </div>
                            </div>
                        ))}
                      </div>
                    </>
                )}
              </div>
          )}

          {/* KOMBİN YARAT EKRANI */}
          {currentView === "combine" && (
              <div className="page-container">
                <div className="header-box">
                  <h2>Kombin Yarat</h2>
                  <p>Anahtar parçanızı yazın, kusursuz görünümünüzü tasarlayalım.</p>

                  {error && <div className="error-msg">Hata: {error}</div>}

                  <div className="search-row">
                    <input
                        className="input-stylish"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Örn: Beyaz keten ceket..."
                        onKeyDown={(e) => e.key === "Enter" && handleCombine()}
                    />
                    <button className="btn-stylish" onClick={handleCombine} disabled={loading.combine}>
                      {loading.combine ? "Hazırlanıyor..." : "Stil Yarat"}
                    </button>
                  </div>
                </div>

                {combineResult?.combination && (
                    <div className="product-grid">
                      {combineResult.combination.map((c, i) => (
                          <div key={i} className="card">
                            <div className="card-img-wrap">
                              {c.image ? <img src={c.image} alt={c.item} /> : <div style={{color:'#a3a3a3'}}>Aranıyor...</div>}
                            </div>
                            <div className="card-body">
                              <span className="badge">Parça {i + 1} {c.site !== "-" ? `• ${c.site}` : ""}</span>
                              <div className="card-title">{c.item}</div>
                              <div className="card-tip">{c.tip}</div>
                              <div className="card-price">{c.price}</div>
                              {c.url && c.url !== "N/A" && c.url !== "" && (
                                  <a href={c.url} target="_blank" rel="noreferrer" className="btn-link">Satın Al</a>
                              )}
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          )}
        </main>
      </div>
  );
}

export default App;