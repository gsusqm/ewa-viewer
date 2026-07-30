import { useEffect, useRef, useCallback, useState } from 'react'
import type { Entity, Extents, Layer, MeasurePoint, ToolMode } from '../types/drawing'

interface Props {
  entities: Record<string, Entity[]>
  layers: Layer[]
  extents: Extents
  visibleLayers: Set<string>
  toolMode: ToolMode
  measurePoints: MeasurePoint[]
  onMeasurePoint: (p: MeasurePoint) => void
  onSelectEntity: (e: Entity | null) => void
  onLog: (msg: string) => void
  selectedEntity: Entity | null
  resetKey: number
}

const ACI_COLORS: string[] = [
  '#000000','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#ffffff',
  '#412f00','#eeeeee','#ff5555','#ffff55','#55ff55','#55ffff','#5555ff','#ff55ff',
  '#400000','#008000','#004040','#000080','#400040','#800040','#808000','#404040',
  '#800000','#00ff80','#00bfff','#0040ff','#4000ff','#8000ff','#ff0080','#ff8000',
  '#ff4040','#40ff40','#40ffff','#4040ff','#ff40ff','#ffff40','#804040','#408040',
  '#804080','#408080','#800080','#808040','#408000','#804000','#608060','#806080',
  '#c08080','#80c000','#80c040','#80c080','#80c0c0','#80c0ff','#c00000','#c04040',
  '#ffc0c0','#ff8000','#c08000','#c0c000','#c0c080','#c0c0c0','#ffa000','#ffa040',
  '#ffbf00','#ffcf00','#ffdf00','#ffef00','#ffff00','#fffc00','#bfff00','#7fff00',
]

function aciToHex(aci: number): string {
  if (aci >= 0 && aci < ACI_COLORS.length) return ACI_COLORS[aci]
  return '#ffffff'
}

const LINE_WIDTH_BY_TYPE: Record<string, number> = {
  LWPOLYLINE: 2.0,
  POLYLINE: 2.0,
  LINE: 1.0,
  CIRCLE: 1.5,
  ARC: 1.5,
  TEXT: 0,
  MTEXT: 0,
  INSERT: 0,
}

export default function DrawingCanvas({
  entities, layers, extents, visibleLayers,
  toolMode, measurePoints, onMeasurePoint, onSelectEntity, onLog, selectedEntity, resetKey,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef({ ox: 0, oy: 0, zoom: 1, dragStartX: 0, dragStartY: 0, lastX: 0, lastY: 0, isDragging: false, isPanning: false, isPressed: false })
  const hoveredRef = useRef<Entity | null>(null)
  const drawnCount = useRef(0)
  const logTimer = useRef(0)
  const selectedRef = useRef(selectedEntity)
  selectedRef.current = selectedEntity

  const log = useCallback((msg: string) => {
    console.log(`[Canvas] ${msg}`)
    onLog(msg)
  }, [onLog])

  const worldToScreen = useCallback((wx: number, wy: number): [number, number] => {
    const v = viewRef.current
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const cx = canvas.width / 2 + (wx - v.ox) * v.zoom
    const cy = canvas.height / 2 - (wy - v.oy) * v.zoom
    return [cx, cy]
  }, [])

  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    const v = viewRef.current
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const wx = (sx - canvas.width / 2) / v.zoom + v.ox
    const wy = -(sy - canvas.height / 2) / v.zoom + v.oy
    return [wx, wy]
  }, [])

  const findEntityAt = useCallback((wx: number, wy: number, tolerancePx: number = 12): Entity | null => {
    const v = viewRef.current
    const worldTol = tolerancePx / v.zoom
    let closest: Entity | null = null
    let minDist = worldTol
    for (const layer of layers) {
      if (!visibleLayers.has(layer.name)) continue
      const layerEntities = entities[layer.name]
      if (!layerEntities) continue
      for (const entity of layerEntities) {
        const d = distToEntity(entity, wx, wy)
        if (d < minDist) {
          minDist = d
          closest = entity
        }
      }
    }
    return closest
  }, [layers, entities, visibleLayers])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width, h = canvas.height
    const v = viewRef.current
    let count = 0
    const t0 = performance.now()

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, w, h)

    // Subtle grid
    const [wx0, wy0] = screenToWorld(0, 0)
    const [wx1, wy1] = screenToWorld(w, h)
    const worldW = wx1 - wx0
    const step = Math.pow(10, Math.round(Math.log10(worldW / 8)))
    const ss = step * v.zoom
    if (ss > 6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      const startX = Math.floor(wx0 / step) * step
      const startY = Math.floor(wy0 / step) * step
      for (let x = startX; x <= wx1; x += step) {
        const [sx] = worldToScreen(x, 0)
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, h); ctx.stroke()
      }
      for (let y = startY; y <= wy1; y += step) {
        const [, sy] = worldToScreen(0, y)
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke()
      }
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw entities
    const hovered = hoveredRef.current
    for (const layer of layers) {
      if (!visibleLayers.has(layer.name)) continue
      const layerEntities = entities[layer.name]
      if (!layerEntities) continue
      const layerInfo = layers.find(l => l.name === layer.name)
      const layerRgb = layerInfo?.rgb || '#ffffff'

      for (const entity of layerEntities) {
        count++
        const isHovered = hovered === entity
        const isSelected = selectedRef.current === entity
        const highlight = isHovered || isSelected
        const color = aciToHex(entity.color)
        const baseWidth = LINE_WIDTH_BY_TYPE[entity.type] ?? 1.0
        const lw = baseWidth * Math.min(v.zoom * 2, 1)
        ctx.strokeStyle = highlight ? '#00ff88' : color
        ctx.fillStyle = highlight ? '#00ff88' : color
        ctx.lineWidth = highlight ? lw + 2 : Math.max(lw, 0.5)
        ctx.globalAlpha = isSelected ? 1 : (isHovered ? 0.9 : 0.75)

        switch (entity.type) {
          case 'LWPOLYLINE': {
            const pts = entity.points
            if (pts.length < 2) continue
            const [sx, sy] = worldToScreen(pts[0][0], pts[0][1])
            ctx.beginPath(); ctx.moveTo(sx, sy)
            for (let i = 1; i < pts.length; i++) {
              const [x, y] = worldToScreen(pts[i][0], pts[i][1])
              ctx.lineTo(x, y)
            }
            if (entity.closed) ctx.closePath()
            ctx.stroke()
            if (highlight) {
              for (const p of pts) {
                const [px, py] = worldToScreen(p[0], p[1])
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill()
              }
            }
            break
          }
          case 'LINE': {
            const [x1, y1] = worldToScreen(entity.start[0], entity.start[1])
            const [x2, y2] = worldToScreen(entity.end[0], entity.end[1])
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
            if (highlight) {
              for (const [x, y] of [[entity.start[0], entity.start[1]], [entity.end[0], entity.end[1]]]) {
                const [px, py] = worldToScreen(x, y)
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill()
              }
            }
            break
          }
          case 'CIRCLE': {
            const [cx, cy] = worldToScreen(entity.center[0], entity.center[1])
            const r = entity.radius * v.zoom
            ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 2), 0, Math.PI * 2); ctx.stroke()
            break
          }
          case 'ARC': {
            const [cx, cy] = worldToScreen(entity.center[0], entity.center[1])
            const r = entity.radius * v.zoom
            const sa = (entity.start_angle * Math.PI) / 180
            const ea = (entity.end_angle * Math.PI) / 180
            ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 2), -sa, -ea); ctx.stroke()
            break
          }
          case 'TEXT': {
            const [tx, ty] = worldToScreen(entity.insert[0], entity.insert[1])
            const size = Math.max(entity.height * v.zoom * 1.5, 10)
            ctx.font = `${size}px sans-serif`
            ctx.globalAlpha = highlight ? 1 : 0.7
            ctx.fillStyle = highlight ? '#00ff88' : color
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.save()
            ctx.translate(tx, ty)
            ctx.rotate((-entity.rotation * Math.PI) / 180)
            ctx.fillText(entity.text.slice(0, 40), 0, 0)
            ctx.restore()
            if (highlight) { ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill() }
            break
          }
          case 'MTEXT': {
            const [tx, ty] = worldToScreen(entity.insert[0], entity.insert[1])
            const size = Math.max(entity.height * v.zoom * 1.5, 10)
            ctx.font = `${size}px sans-serif`
            ctx.globalAlpha = highlight ? 1 : 0.7
            ctx.fillStyle = highlight ? '#00ff88' : color
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
            ctx.save(); ctx.translate(tx, ty); ctx.rotate((-entity.rotation * Math.PI) / 180)
            const lines = entity.text.split('\\n')
            lines.forEach((line, i) => ctx.fillText(line.slice(0, 60), 0, i * size * 1.3))
            ctx.restore()
            break
          }
          case 'INSERT': {
            const [ix, iy] = worldToScreen(entity.insert[0], entity.insert[1])
            ctx.globalAlpha = highlight ? 1 : 0.65
            ctx.fillStyle = highlight ? '#00ff88' : color
            ctx.strokeStyle = highlight ? '#00ff88' : color
            const sz = Math.max(5 * v.zoom, 5)
            ctx.fillRect(ix - sz / 2, iy - sz / 2, sz, sz)
            ctx.lineWidth = 1.5
            ctx.strokeRect(ix - sz, iy - sz, sz * 2, sz * 2)
            break
          }
        }
        ctx.globalAlpha = 1
      }
    }

    // Measurement overlay
    if (measurePoints.length > 0) {
      // Draw points (small green circles)
      for (let i = 0; i < measurePoints.length; i++) {
        const [sx, sy] = worldToScreen(measurePoints[i].x, measurePoints[i].y)
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fillStyle = '#00ff44'; ctx.fill()
      }
      // Draw connecting dashed lines
      ctx.strokeStyle = '#00ff44'; ctx.lineWidth = 2; ctx.setLineDash([5, 5])
      for (let i = 1; i < measurePoints.length; i++) {
        const [px, py] = worldToScreen(measurePoints[i - 1].x, measurePoints[i - 1].y)
        const [sx, sy] = worldToScreen(measurePoints[i].x, measurePoints[i].y)
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke()
      }
      // Draw total distance label
      if (measurePoints.length >= 2) {
        let totalDist = 0
        for (let j = 1; j < measurePoints.length; j++) {
          const dx = measurePoints[j].x - measurePoints[j - 1].x
          const dy = measurePoints[j].y - measurePoints[j - 1].y
          totalDist += Math.sqrt(dx * dx + dy * dy)
        }
        const [mx, my] = worldToScreen(
          (measurePoints[0].x + measurePoints[measurePoints.length - 1].x) / 2,
          (measurePoints[0].y + measurePoints[measurePoints.length - 1].y) / 2,
        )
        ctx.setLineDash([]); ctx.font = '13px sans-serif'; ctx.fillStyle = '#00ff44'
        ctx.textAlign = 'center'; ctx.fillText(`${totalDist.toFixed(2)} m`, mx, my - 15)
      }
      ctx.setLineDash([])
    }

    const dt = performance.now() - t0
    drawnCount.current = count
    // Log at most once per second
    const now = Date.now()
    if (now - logTimer.current > 1000) {
      logTimer.current = now
      log(`Render: ${count} entities en ${dt.toFixed(1)}ms`)
    }
  }, [entities, layers, extents, visibleLayers, measurePoints, worldToScreen, screenToWorld, log])

  // Redraw when selection, measure points, or layer visibility changes
  useEffect(() => { draw() }, [selectedEntity])
  useEffect(() => { draw() }, [measurePoints])
  useEffect(() => { draw() }, [visibleLayers])

  // Initialize view once
  const initView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const v = viewRef.current
    v.ox = (extents.xmin + extents.xmax) / 2
    v.oy = (extents.ymin + extents.ymax) / 2
    const dx = extents.xmax - extents.xmin
    const dy = extents.ymax - extents.ymin
    if (dx > 0 && dy > 0) {
      const parent = canvas.parentElement!
      v.zoom = Math.min(parent.clientWidth / dx, parent.clientHeight / dy) * 0.9
    }
  }, [extents])

  useEffect(() => {
    initView()
    draw()
  }, [])

  // Reset view when resetKey changes
  useEffect(() => {
    initView()
    draw()
  }, [resetKey])

  // Resize only — does NOT reset zoom/pan
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement!
      const rect = parent.getBoundingClientRect()
      const dpr = devicePixelRatio
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      drawRef.current()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    resize()
    return () => ro.disconnect()
  }, [])

  // Mouse handlers — right-drag pans, left-click does mode action
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const v = viewRef.current
    v.isPressed = true
    v.dragStartX = e.clientX
    v.dragStartY = e.clientY
    v.isDragging = false
    if (e.button === 2) {
      v.isPanning = true
      e.preventDefault()
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const v = viewRef.current
    const rect = canvas.getBoundingClientRect()

    // If a button is held, detect drag
    if (v.isPressed) {
      const dx = e.clientX - v.dragStartX
      const dy = e.clientY - v.dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        v.isDragging = true
      }
    }

    // Right-drag panning (works in any mode)
    if (v.isPanning) {
      v.ox -= (e.clientX - v.lastX) / v.zoom
      v.oy += (e.clientY - v.lastY) / v.zoom
      draw()
      v.lastX = e.clientX
      v.lastY = e.clientY
      return
    }

    // Hover hit-test (only in select mode, works without clicking)
    if (toolMode === 'select') {
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const [wx, wy] = screenToWorld(mx, my)
      const hit = findEntityAt(wx, wy, 10)
      if (hit !== hoveredRef.current) {
        hoveredRef.current = hit
        draw()
      }
    } else if (hoveredRef.current !== null) {
      hoveredRef.current = null
      draw()
    }
    v.lastX = e.clientX
    v.lastY = e.clientY
  }, [toolMode, screenToWorld, findEntityAt, draw])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const v = viewRef.current
    if (v.isPanning) {
      v.isPanning = false
      v.isDragging = false
      v.isPressed = false
      return
    }
    if (e.button === 0 && !v.isDragging) {
      // Left-click (no drag) — mode action
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const [wx, wy] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)

      if (toolMode === 'measure') {
        onMeasurePoint({ x: wx, y: wy })
        log(`Medición: punto (${wx.toFixed(2)}, ${wy.toFixed(2)})`)
      } else if (toolMode === 'select') {
        const hit = findEntityAt(wx, wy, 12)
        onSelectEntity(hit)
        log(`Selección: ${hit ? `${hit.type} en capa "${hit.layer}"` : 'ninguna'}`)
      }
    }
    v.isPanning = false
    v.isDragging = false
    v.isPressed = false
  }, [toolMode, screenToWorld, findEntityAt, onMeasurePoint, onSelectEntity, log])

  const handleMouseLeave = useCallback(() => {
    const v = viewRef.current
    v.isPanning = false
    v.isDragging = false
    v.isPressed = false
    hoveredRef.current = null
    draw()
  }, [draw])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const v = viewRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const [wx, wy] = screenToWorld(mx, my)
    const factor = e.deltaY > 0 ? 0.88 : 1.14
    v.zoom = Math.max(v.zoom * factor, 0.00005)
    v.zoom = Math.min(v.zoom, 50000)
    v.ox = wx - (mx - canvas.width / 2) / v.zoom
    v.oy = wy + (my - canvas.height / 2) / v.zoom
    log(`Zoom: ${v.zoom.toFixed(2)}`)
    draw()
  }, [screenToWorld, draw, log])

  const cursor = toolMode === 'measure' ? 'crosshair' : 'default'

  return (
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />
  )
}

function distToEntity(e: Entity, wx: number, wy: number): number {
  switch (e.type) {
    case 'LINE':
      return distToSegment(wx, wy, e.start[0], e.start[1], e.end[0], e.end[1])
    case 'LWPOLYLINE': {
      let min = Infinity
      for (let i = 0; i < e.points.length - 1; i++) {
        const d = distToSegment(wx, wy, e.points[i][0], e.points[i][1], e.points[i + 1][0], e.points[i + 1][1])
        if (d < min) min = d
      }
      return min
    }
    case 'CIRCLE':
      return Math.abs(Math.sqrt((wx - e.center[0]) ** 2 + (wy - e.center[1]) ** 2) - e.radius)
    case 'TEXT':
    case 'MTEXT':
    case 'INSERT':
      return Math.sqrt((wx - e.insert[0]) ** 2 + (wy - e.insert[1]) ** 2)
    default:
      return Infinity
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2)
}
