import type { Layer } from '../types/drawing'

interface Props {
  layers: Layer[]
  visibleLayers: Set<string>
  onToggle: (name: string) => void
  onToggleAll: (visible: boolean) => void
}

export default function LayerPanel({ layers, visibleLayers, onToggle, onToggleAll }: Props) {
  const visible = layers.filter(l => visibleLayers.has(l.name)).length
  return (
    <div style={{ padding: '8px', fontSize: '12px', color: '#c9d1d9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '0 4px' }}>
        <strong>Capas ({layers.length})</strong>
        <span style={{ fontSize: '11px', color: '#8b949e' }}>
          {visible}/{layers.length}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button onClick={() => onToggleAll(true)} style={btnStyle}>Todo</button>
        <button onClick={() => onToggleAll(false)} style={btnStyle}>Nada</button>
      </div>
      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {layers.map(layer => (
          <div
            key={layer.name}
            onMouseEnter={() => {}}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 4px',
              cursor: 'pointer',
              opacity: visibleLayers.has(layer.name) ? 1 : 0.35,
              borderRadius: '4px',
            }}
            onClick={() => onToggle(layer.name)}
          >
            <input
              type="checkbox"
              checked={visibleLayers.has(layer.name)}
              readOnly
              style={{ accentColor: layer.rgb === '#ffffff' ? '#58a6ff' : layer.rgb }}
            />
            <span style={{
              width: '10px', height: '10px', borderRadius: '2px',
              backgroundColor: layer.rgb === '#ffffff' ? '#8b949e' : layer.rgb,
              border: '1px solid #30363d', flexShrink: 0,
            }} />
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              color: visibleLayers.has(layer.name) ? '#c9d1d9' : '#484f58',
            }}>
              {layer.name}
            </span>
            <span style={{ color: '#484f58', fontSize: '10px', flexShrink: 0 }}>{layer.entity_count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  flex: 1, fontSize: '11px', padding: '2px 8px',
  background: '#21262d', border: '1px solid #30363d', color: '#8b949e',
  borderRadius: '4px', cursor: 'pointer',
}
