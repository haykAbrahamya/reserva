// ─────────────────────────────────────────────────────────────
// A PDF of whole-page images, each page at a real print size.
//
// Hand-written rather than a PDF library: "one JPEG per page" is two objects
// per page plus a catalog and a cross-reference table, and a library would add
// ~300 kB to a tool that needs none of the rest. JPEG goes in as-is
// (DCTDecode), so there is no re-encoding and no quality loss.
// ─────────────────────────────────────────────────────────────

export interface ImagePage {
  /** JPEG bytes. */
  jpeg: Uint8Array
  pixelWidth: number
  pixelHeight: number
  /** Page size in millimetres; the image fills it. */
  widthMm: number
  heightMm: number
}

const MM_TO_PT = 72 / 25.4

/** One page per image, in order: a gift card is one page, a business card's front and back two. */
export function jpegsToPdf(pages: readonly ImagePage[]): Blob {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0

  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string) => {
    offsets[id] = length
    write(`${id} 0 obj\n${body}\nendobj\n`)
  }

  // Objects 1 and 2 are the catalog and the page tree; each page then takes
  // three: the page itself, its image, and the one-line drawing of it.
  const pageId = (i: number) => 3 + i * 3
  const kids = pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')

  // The second line's high bytes tell transfer tools this file is binary.
  write('%PDF-1.4\n%âãÏÓ\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)

  pages.forEach((page, i) => {
    const id = pageId(i)
    const pageWidth = (page.widthMm * MM_TO_PT).toFixed(2)
    const pageHeight = (page.heightMm * MM_TO_PT).toFixed(2)
    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`

    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /XObject << /Im0 ${id + 1} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${id + 2} 0 R >>`,
    )

    offsets[id + 1] = length
    write(
      `${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} /Height ${page.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    )
    write(page.jpeg)
    write('\nendstream\nendobj\n')

    object(id + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  // Every cross-reference entry is exactly 20 bytes: offset, generation, flag, EOL.
  const count = offsets.length
  const xref = length
  const entries = offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
  write(`xref\n0 ${count}\n0000000000 65535 f \n${entries.join('')}`)
  write(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

/** A one-page PDF of one image. */
export const jpegToPdf = (page: ImagePage): Blob => jpegsToPdf([page])
