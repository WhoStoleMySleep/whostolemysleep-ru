export interface Tag {
  id: number
  name: string
}

export interface ProductImage {
  id: number
  url: string | null
  alt: string | null
}

export interface Product {
  id: number
  type: 'blog' | 'project'
  title: string
  text: string
  text_short: string
  author: string | null
  url: string | null
  tags: Tag[]
  images: ProductImage[]
  date: string
}

export interface AboutMe {
  id: number
  text: string
}

export interface InformDetail {
  id: number
  text: string
}

export interface Inform {
  id: number
  title: string
  type: 'experience' | 'education'
  place: string
  dateString: string
  InformDetails: InformDetail[]
}

export interface Skills {
  id: number
  languages: string
  frameworks: string
  cms: string
  instruments: string
}

export interface ContactPayload {
  name: string
  email: string
  message: string
}
