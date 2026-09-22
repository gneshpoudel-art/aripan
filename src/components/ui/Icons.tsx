type IconProps = { title: string }

export function IconSearch({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </svg>
  )
}

export function IconHeart({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <path d="M12 20s-7-4.4-9.2-8.2C.8 8.6 2.4 5 6 5c2 0 3.3 1 4 2 0.7-1 2-2 4-2 3.6 0 5.2 3.6 3.2 6.8C19 15.6 12 20 12 20z" />
    </svg>
  )
}

export function IconBag({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  )
}

export function IconMenu({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconClose({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconShare({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <title>{title}</title>
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M8 12.8l8 5.2M16 6.2l-8 5" />
    </svg>
  )
}
