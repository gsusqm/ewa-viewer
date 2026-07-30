import type { Entity, MeasurePoint } from '../types/drawing'

interface Props {
  entity: Entity | null
  measurePoints: MeasurePoint[]
}

export default function PropertyPanel({ entity, measurePoints }: Props) {
  let totalDist = 0
  for (let i = 1; i < measurePoints.length; i++) {
    const dx = measurePoints[i].x - measurePoints[i - 1].x
    const dy = measurePoints[i].y - measurePoints[i - 1].y
    totalDist += Math.sqrt(dx * dx + dy * dy)
  }

  return (
    <div style={{ padding: '8px', fontSize: '12px', color: '#c9d1d9' }}>
      <strong style={{ color: '#8b949e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Propiedades
      </strong>

      {measurePoints.length > 0 && (
        <div style={{
          marginTop: '8px', padding: '8px', background: '#0a2a0a',
          borderRadius: '6px', border: '1px solid #1a4a1a',
        }}>
          <div style={{ color: '#3fb950', fontWeight: 600, fontSize: '11px' }}>Medici\u00f3n</div>
          <div style={{ color: '#3fb950', fontSize: '13px', marginTop: '4px' }}>
            Distancia: <strong>{totalDist.toFixed(2)} m</strong>
          </div>
          <div style={{ color: '#484f58', fontSize: '10px', marginTop: '2px' }}>
            {measurePoints.length} punto{measurePoints.length > 1 ? 's' : ''}
          </div>
          {measurePoints.map((p, i) => (
            <div key={i} style={{ color: '#484f58', fontSize: '10px', marginTop: '1px' }}>
              P{i + 1}: ({p.x.toFixed(2)}, {p.y.toFixed(2)})
            </div>
          ))}
        </div>
      )}

      {entity && (
        <div style={{ marginTop: '8px' }}>
          <div style={{
            padding: '6px 0', borderBottom: '1px solid #21262d',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#484f58' }}>Tipo</span>
            <span style={{ color: '#58a6ff', fontWeight: 600 }}>{entity.type}</span>
          </div>
          <div style={{
            padding: '6px 0', borderBottom: '1px solid #21262d',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#484f58' }}>Capa</span>
            <span>{entity.layer}</span>
          </div>
          <div style={{
            padding: '6px 0', borderBottom: '1px solid #21262d',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#484f58' }}>Color ACI</span>
            <span>{entity.color}</span>
          </div>
          {'closed' in entity && entity.closed !== undefined && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#484f58' }}>Cerrado</span>
              <span>{entity.closed ? 'S\u00ed' : 'No'}</span>
            </div>
          )}
          {'points' in entity && entity.points && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#484f58' }}>V\u00e9rtices</span>
              <span>{entity.points.length}</span>
            </div>
          )}
          {'block' in entity && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#484f58' }}>Bloque</span>
              <span>{entity.block}</span>
            </div>
          )}
          {'text' in entity && entity.text && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
            }}>
              <span style={{ color: '#484f58' }}>Texto</span>
              <div style={{ marginTop: '2px', wordBreak: 'break-word', color: '#8b949e', fontSize: '11px' }}>
                {entity.text.slice(0, 100)}
              </div>
            </div>
          )}
          {'height' in entity && typeof entity.height === 'number' && entity.height > 0 && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#484f58' }}>Altura texto</span>
              <span>{entity.height.toFixed(2)}</span>
            </div>
          )}
          {'rotation' in entity && typeof entity.rotation === 'number' && (
            <div style={{
              padding: '6px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#484f58' }}>Rotaci\u00f3n</span>
              <span>{entity.rotation.toFixed(1)}\u00b0</span>
            </div>
          )}
          {'start' in entity && (
            <div style={{ padding: '6px 0', borderBottom: '1px solid #21262d' }}>
              <span style={{ color: '#484f58' }}>Inicio</span>
              <div style={{ color: '#8b949e', fontSize: '10px' }}>
                ({entity.start[0].toFixed(2)}, {entity.start[1].toFixed(2)})
              </div>
            </div>
          )}
          {'end' in entity && (
            <div style={{ padding: '6px 0', borderBottom: '1px solid #21262d' }}>
              <span style={{ color: '#484f58' }}>Fin</span>
              <div style={{ color: '#8b949e', fontSize: '10px' }}>
                ({entity.end[0].toFixed(2)}, {entity.end[1].toFixed(2)})
              </div>
            </div>
          )}
        </div>
      )}

      {!entity && measurePoints.length === 0 && (
        <div style={{ marginTop: '12px', color: '#484f58', fontStyle: 'italic', fontSize: '11px', lineHeight: '1.6' }}>
          <div>Selecciona una entidad usando la herramienta &ldquo;Seleccionar&rdquo;</div>
          <div style={{ marginTop: '4px' }}>o mide distancias con &ldquo;Medir&rdquo;</div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#30363d' }}>
            Tooltip: al pasar el mouse sobre entidades se resaltan en verde
          </div>
        </div>
      )}
    </div>
  )
}
