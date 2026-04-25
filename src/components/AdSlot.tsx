import { useEffect } from 'react'

declare global {
  interface Window {
    adsbygoogle: object[]
  }
}

interface Props {
  variant: 'banner' | 'feed'
}

export function AdSlot({ variant }: Props) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch { /* ignore double-init in dev/HMR */ }
  }, [])

  if (variant === 'banner') {
    return (
      <div className="flex justify-center my-2 overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-7745507566538945"
          data-ad-slot="5283532716"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-format="fluid"
      data-ad-layout-key="-hr-7+2n-1d-69"
      data-ad-client="ca-pub-7745507566538945"
      data-ad-slot="5097409467"
    />
  )
}
