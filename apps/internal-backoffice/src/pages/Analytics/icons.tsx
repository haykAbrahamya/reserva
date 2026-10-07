import {
  Phone, Instagram, Facebook, Send, Navigation, Globe, Mail, Link2, Search, ScanSearch, Music2,
  Megaphone, MousePointerClick, Smartphone, Tablet, Monitor, Tv, MessageCircle,
} from 'lucide-react'
import { WhatsappIcon } from '@/components/ui'
import { ReservaMark } from '@/components/ReservaMark'

// One glyph per channel / device so a list can be scanned by shape before it is
// read. Unknown values fall back to a neutral glyph rather than nothing, so a
// row never loses its alignment.

/** A contact_click channel (`props.ch`). */
export function ContactIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  switch (channel) {
    case 'call': return <Phone size={size} />
    case 'whatsapp': return <WhatsappIcon size={size - 1} />
    case 'instagram': return <Instagram size={size} />
    case 'facebook': return <Facebook size={size} />
    case 'telegram': return <Send size={size} />
    case 'directions': return <Navigation size={size} />
    case 'website': return <Globe size={size} />
    case 'email': return <Mail size={size} />
    default: return <MessageCircle size={size} />
  }
}

/** A session's traffic channel (server-derived, contract §4). */
export function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  switch (channel) {
    case 'direct': return <MousePointerClick size={size} />
    case 'reserva': return <ReservaMark size={size + 2} />
    case 'instagram': return <Instagram size={size} />
    case 'facebook': return <Facebook size={size} />
    case 'google': return <Search size={size} />
    case 'search': return <ScanSearch size={size} />
    case 'tiktok': return <Music2 size={size} />
    case 'telegram': return <Send size={size} />
    case 'whatsapp': return <WhatsappIcon size={size - 1} />
    case 'campaign': return <Megaphone size={size} />
    default: return <Link2 size={size} />
  }
}

export function DeviceIcon({ type, size = 14 }: { type: string | null | undefined; size?: number }) {
  switch (type) {
    case 'mobile': return <Smartphone size={size} />
    case 'tablet': return <Tablet size={size} />
    case 'smarttv': return <Tv size={size} />
    default: return <Monitor size={size} />
  }
}
