const BASE = 'https://ewa-viewer.onrender.com'

export async function uploadDrawing(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/api/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export async function getDrawing(id: string) {
  const res = await fetch(`${BASE}/api/drawing/${id}`)
  if (!res.ok) throw new Error(`Get drawing failed: ${res.status}`)
  return res.json()
}

export async function getDrawingLayers(id: string) {
  const res = await fetch(`${BASE}/api/drawing/${id}/layers`)
  if (!res.ok) throw new Error(`Get layers failed: ${res.status}`)
  return res.json()
}
