import { useState } from 'react'
import './App.css'

function App() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8080/api/search/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      })
      const data = await res.json()
      // Gemini'dan gelen optimize edilmiş anahtar kelimeleri gösteriyoruz
      setResult(data.candidates[0].content.parts[0].text)
    } catch (error) {
      alert("Backend'e bağlanılamadı!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>🛍️ ShoppingAI</h1>
      <div className="search-area">
        <input
          type="text"
          placeholder="Ne aramıştınız? (Örn: Siyah deri ceket)"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Analiz ediliyor...' : 'Ara'}
        </button>
      </div>
      {result && (
        <div className="result">
          <p>Optimize Edilen Arama Terimleri: <strong>{result}</strong></p>
        </div>
      )}
    </div>
  )
}

export default App