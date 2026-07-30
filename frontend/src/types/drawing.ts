export interface Layer {
  name: string
  color: number
  rgb: string
  linetype: string
  locked: boolean
  on: boolean
  entity_count: number
}

export interface Extents {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export interface BaseEntity {
  type: string
  layer: string
  color: number
}

export interface LwpolylineEntity extends BaseEntity {
  type: 'LWPOLYLINE'
  closed: boolean
  points: [number, number][]
}

export interface LineEntity extends BaseEntity {
  type: 'LINE'
  start: [number, number]
  end: [number, number]
}

export interface ArcEntity extends BaseEntity {
  type: 'ARC'
  center: [number, number]
  radius: number
  start_angle: number
  end_angle: number
}

export interface CircleEntity extends BaseEntity {
  type: 'CIRCLE'
  center: [number, number]
  radius: number
}

export interface TextEntity extends BaseEntity {
  type: 'TEXT'
  text: string
  insert: [number, number]
  height: number
  rotation: number
}

export interface MTextEntity extends BaseEntity {
  type: 'MTEXT'
  text: string
  insert: [number, number]
  height: number
  rotation: number
  width: number
}

export interface InsertEntity extends BaseEntity {
  type: 'INSERT'
  block: string
  insert: [number, number]
  scale: [number, number]
  rotation: number
}

export type Entity =
  | LwpolylineEntity
  | LineEntity
  | ArcEntity
  | CircleEntity
  | TextEntity
  | MTextEntity
  | InsertEntity

export interface DrawingData {
  drawing_id: string
  filename: string
  layers: Layer[]
  entities: Record<string, Entity[]>
  extents: Extents
  total_entities: number
  dxf_version?: string
}

export interface MeasurePoint {
  x: number
  y: number
}

export type ToolMode = 'select' | 'measure'
