import { useState, useCallback } from 'react'
import type { DrawingData, Entity, Layer, MeasurePoint, ToolMode } from './types/drawing'
import { uploadDrawing } from './api/drawingApi'
import DrawingCanvas from './components/DrawingCanvas'
import LayerPanel from './components/LayerPanel'
import PropertyPanel from './components/PropertyPanel'

const MAX_LOG = 100

export default function App() {
  const [drawing, setDrawing] = useState<DrawingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set())
  const [toolMode, setToolMode] = useState<ToolMode>('select')
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const handleLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-MAX_LOG + 1), msg])
  }, [])

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    handleLog(`Subiendo ${file.name}...`)
    try {
      const data = await uploadDrawing(file)
      setDrawing(data)
      setVisibleLayers(new Set(data.layers.filter((l: Layer) => l.on && !l.locked).map((l: Layer) => l.name)))
      setMeasurePoints([])
      setSelectedEntity(null)
      handleLog(`Archivo cargado: ${data.total_entities} entidades, ${data.layers.length} capas`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar archivo'
      setError(msg)
      handleLog(`ERROR: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [handleLog])

  const handleToggleLayer = useCallback((name: string) => {
    setVisibleLayers(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const handleToggleAllLayers = useCallback((visible: boolean) => {
    if (!drawing) return
    setVisibleLayers(new Set(visible ? drawing.layers.map(l => l.name) : []))
  }, [drawing])

  const handleMeasurePoint = useCallback((p: MeasurePoint) => {
    setMeasurePoints(prev => [...prev, p])
    handleLog(`Punto de medición: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`)
  }, [handleLog])

  const handleSelectEntity = useCallback((e: Entity | null) => {
    setSelectedEntity(e)
    if (e) {
      handleLog(`Seleccionado: ${e.type} capa="${e.layer}"`)
    }
  }, [handleLog])

  const clearMeasure = useCallback(() => {
    setMeasurePoints([])
    handleLog('Medición limpiada')
  }, [handleLog])

  const clearSelection = useCallback(() => {
    setSelectedEntity(null)
  }, [])

  const handleReset = useCallback(() => {
    setSelectedEntity(null)
    setMeasurePoints([])
    setResetKey(k => k + 1)
    handleLog('Vista reiniciada')
  }, [handleLog])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui, sans-serif', fontSize: '13px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0 }}>
        <span style={{ color: '#58a6ff', fontWeight: 700, fontSize: '15px', letterSpacing: '0.3px' }}>EWA Viewer</span>
        <label style={{
          padding: '5px 14px', background: '#21262d', borderRadius: '6px',
          cursor: loading ? 'wait' : 'pointer', border: '1px solid #30363d',
          fontSize: '12px', color: '#c9d1d9',
        }}>
          {loading ? 'Procesando...' : 'Cargar DWG/DXF'}
          <input type="file" accept=".dwg,.dxf" onChange={handleFile} style={{ display: 'none' }} disabled={loading} />
        </label>
        {drawing && (
          <span style={{ color: '#8b949e', fontSize: '12px' }}>
            {drawing.filename} — {drawing.total_entities} entidades
          </span>
        )}
        {error && <span style={{ color: '#f85149' }}>{error}</span>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowLogs(v => !v)} style={{
          background: 'none', border: '1px solid #30363d', color: '#8b949e',
          borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontSize: '11px',
        }}>
          {showLogs ? 'Ocultar Logs' : 'Ver Logs'} ({logs.length})
        </button>
      </div>

      {/* Toolbar */}
      {drawing && (
        <div style={{ display: 'flex', gap: '6px', padding: '5px 16px', background: '#0d1117', borderBottom: '1px solid #21262d', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['select', 'measure'] as ToolMode[]).map(mode => (
            <button key={mode} onClick={() => { setToolMode(mode); if (mode !== 'select') { setSelectedEntity(null) } }}
              style={{
                padding: '4px 12px', fontSize: '12px', borderRadius: '6px',
                border: `1px solid ${toolMode === mode ? '#58a6ff' : '#30363d'}`,
                background: toolMode === mode ? '#1f3348' : '#21262d',
                color: toolMode === mode ? '#58a6ff' : '#8b949e',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
              {mode === 'select' ? '\u{2611} Seleccionar' : '\u{2694} Medir'}
            </button>
          ))}
          {selectedEntity && (
            <button onClick={clearSelection} style={{
              padding: '4px 12px', fontSize: '12px', borderRadius: '6px',
              border: '1px solid #30363d', background: '#21262d', color: '#f85149', cursor: 'pointer',
            }}>
              {'\u2716 Desseleccionar'}
            </button>
          )}
          {measurePoints.length > 0 && (
            <button onClick={clearMeasure} style={{
              padding: '4px 12px', fontSize: '12px', borderRadius: '6px',
              border: '1px solid #30363d', background: '#21262d', color: '#f85149', cursor: 'pointer',
            }}>
              {'\u2716 Limpiar medici\u00f3n (' + measurePoints.length + ' pts)'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={handleReset} style={{
            padding: '4px 12px', fontSize: '12px', borderRadius: '6px',
            border: '1px solid #30363d', background: '#21262d', color: '#8b949e', cursor: 'pointer',
          }}>
            {'\u21BA Reiniciar vista'}
          </button>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {!drawing ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#484f58', fontSize: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>{'\u{1F4D0}'}</div>
                <div>Carga un archivo DWG o DXF para empezar</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#30363d' }}>
                  Click izquierdo = seleccionar &bull; Click derecho arrastrar = mover &bull; Rueda = zoom
                </div>
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#30363d' }}>
                  Backend requerido en puerto 8002
                </div>
              </div>
            </div>
          ) : (
            <DrawingCanvas
              entities={drawing.entities}
              layers={drawing.layers}
              extents={drawing.extents}
              visibleLayers={visibleLayers}
              toolMode={toolMode}
              measurePoints={measurePoints}
              onMeasurePoint={handleMeasurePoint}
              onSelectEntity={handleSelectEntity}
              onLog={handleLog}
              selectedEntity={selectedEntity}
              resetKey={resetKey}
            />
          )}
        </div>

        {/* Right panel */}
        {drawing && (
          <div style={{ width: '280px', borderLeft: '1px solid #21262d', background: '#0d1117', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid #21262d' }}>
              <LayerPanel
                layers={drawing.layers}
                visibleLayers={visibleLayers}
                onToggle={handleToggleLayer}
                onToggleAll={handleToggleAllLayers}
              />
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <PropertyPanel entity={selectedEntity} measurePoints={measurePoints} />
            </div>
          </div>
        )}
      </div>

      {/* Log panel */}
      {showLogs && (
        <div style={{
          height: '150px', borderTop: '1px solid #21262d', background: '#0d1117',
          overflow: 'auto', fontFamily: 'monospace', fontSize: '11px', padding: '4px 8px',
          flexShrink: 0,
        }}>
          <div style={{ color: '#8b949e', marginBottom: '4px', fontSize: '10px' }}>
            LOG ({logs.length})
          </div>
          {logs.map((msg, i) => (
            <div key={i} style={{
              color: msg.startsWith('ERROR') ? '#f85149' : msg.includes('Seleccionado') ? '#58a6ff' : msg.includes('Render') ? '#484f58' : '#8b949e',
              padding: '1px 0', whiteSpace: 'nowrap',
            }}>
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
