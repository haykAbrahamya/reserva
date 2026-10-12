// ─────────────────────────────────────────────────────────────
// A one-page PDF holding one image, at a real print size.
//
// Hand-written rather than a PDF library: "one JPEG on one page" is five
// objects and a cross-reference table, and a library would add ~300 kB to a
// tool that needs none of the rest. JPEG goes in as-is (DCTDecode), so there
// is no re-encoding and no quality loss.
// ─────────────────────────────────────────────────────────────

interface ImagePdf {
  /** JPEG bytes. */
  jpeg: Uint8Array
  pixelWidth: number
  pixelHeight: number
  /** Page size in millimetres; the image fills it. */
  widthMm: number
  heightMm: number
}

const MM_TO_PT = 72 / 25.4

export function jpegToPdf({ jpeg, pixelWidth, pixelHeight, widthMm, heightMm }: ImagePdf): Blob {
  const pageWidth = (widthMm * MM_TO_PT).toFixed(2)
  const pageHeight = (heightMm * MM_TO_PT).toFixed(2)
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`

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

  // The second line's high bytes tell transfer tools this file is binary.
  write('%PDF-1.4\n%âãÏÓ\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>',
  )

  offsets[4] = length
  write(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  write(jpeg)
  write('\nendstream\nendobj\n')

  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  // Every cross-reference entry is exactly 20 bytes: offset, generation, flag, EOL.
  const xref = length
  const entries = offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
  write(`xref\n0 6\n0000000000 65535 f \n${entries.join('')}`)
  write(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
