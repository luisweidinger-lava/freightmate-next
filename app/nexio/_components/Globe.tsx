'use client'

import { useEffect, useRef, useState } from 'react'

const RADIUS = 1.5

const PORTS: Record<string, { lat: number; lng: number }> = {
  Rotterdam:  { lat: 51.9,  lng: 4.5   },
  Singapore:  { lat: 1.3,   lng: 103.8 },
  Shanghai:   { lat: 31.2,  lng: 121.5 },
  NewYork:    { lat: 40.7,  lng: -74.0 },
  Dubai:      { lat: 25.2,  lng: 55.3  },
  Hamburg:    { lat: 53.6,  lng: 9.9   },
  LosAngeles: { lat: 33.7,  lng: -118.3},
  Tokyo:      { lat: 35.7,  lng: 139.7 },
  Antwerp:    { lat: 51.3,  lng: 4.4   },
  HongKong:   { lat: 22.3,  lng: 114.2 },
}

const ROUTES = [
  ['Shanghai', 'Rotterdam'],
  ['Singapore', 'Dubai'],
  ['NewYork', 'Hamburg'],
  ['Rotterdam', 'NewYork'],
  ['Shanghai', 'LosAngeles'],
  ['Dubai', 'Rotterdam'],
  ['Tokyo', 'LosAngeles'],
  ['Singapore', 'Tokyo'],
  ['HongKong', 'Antwerp'],
  ['Shanghai', 'Singapore'],
]

function latLngToVec3(lat: number, lng: number, r: number, THREE: typeof import('three')) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

function GlobeFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full"
           style={{ background: 'radial-gradient(circle at 35% 35%, #1e40af, #0b1e3e 70%)' }}>
        {/* Atmosphere halo */}
        <div className="absolute inset-[-6px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }} />
        {/* Grid lines SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="99" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
          <ellipse cx="100" cy="100" rx="99" ry="40" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
          <ellipse cx="100" cy="100" rx="99" ry="70" fill="none" stroke="#60a5fa" strokeWidth="0.3" />
          <line x1="1" y1="100" x2="199" y2="100" stroke="#60a5fa" strokeWidth="0.5" />
          <line x1="100" y1="1" x2="100" y2="199" stroke="#60a5fa" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  )
}

export default function Globe() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!mountRef.current) return

    // WebGL check
    const testCanvas = document.createElement('canvas')
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    if (!gl) { setFailed(true); return }

    let animId: number
    let renderer: import('three').WebGLRenderer | null = null

    const run = async () => {
      try {
        const THREE = await import('three')
        const container = mountRef.current!
        const W = container.clientWidth
        const H = container.clientHeight

        // Scene
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
        camera.position.set(0, 0.4, 4.8)

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(W, H)
        renderer.setClearColor(0x000000, 0)
        container.appendChild(renderer.domElement)

        // Globe group — everything attached here rotates together
        const group = new THREE.Group()
        scene.add(group)

        // Core sphere
        const sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64)
        const sphereMat = new THREE.MeshPhongMaterial({
          color:    0x0b1e3e,
          emissive: 0x061428,
          specular: 0x1e3a5f,
          shininess: 20,
        })
        group.add(new THREE.Mesh(sphereGeo, sphereMat))

        // Atmosphere (back-face outer sphere)
        const atmGeo = new THREE.SphereGeometry(RADIUS * 1.055, 64, 64)
        const atmMat = new THREE.MeshBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.07,
          side: THREE.BackSide,
        })
        group.add(new THREE.Mesh(atmGeo, atmMat))

        // Graticule lines (meridians + parallels)
        const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.35 })
        const GR = RADIUS + 0.005
        for (let lng = 0; lng < 360; lng += 30) {
          const pts: import('three').Vector3[] = []
          for (let lat = -90; lat <= 90; lat += 3)
            pts.push(latLngToVec3(lat, lng, GR, THREE))
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat.clone()))
        }
        for (let lat = -60; lat <= 60; lat += 30) {
          const pts: import('three').Vector3[] = []
          for (let lng = 0; lng <= 360; lng += 3)
            pts.push(latLngToVec3(lat, lng, GR, THREE))
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat.clone()))
        }

        // Port positions
        const portVecs: Record<string, import('three').Vector3> = {}
        for (const [name, { lat, lng }] of Object.entries(PORTS)) {
          portVecs[name] = latLngToVec3(lat, lng, RADIUS + 0.015, THREE)
        }

        // Port dots
        const dotGeo = new THREE.SphereGeometry(0.022, 8, 8)
        const dotMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd })
        for (const pos of Object.values(portVecs)) {
          const dot = new THREE.Mesh(dotGeo, dotMat.clone())
          dot.position.copy(pos)
          group.add(dot)
        }

        // Arcs (static dim path + animated traveling head)
        type ArcState = {
          curve: import('three').QuadraticBezierCurve3
          progress: number
          speed: number
          head: import('three').Mesh
        }
        const arcStates: ArcState[] = []

        const arcLineMat = new THREE.LineBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.4 })
        const headGeo = new THREE.SphereGeometry(0.018, 8, 8)

        for (const [from, to] of ROUTES) {
          if (!portVecs[from] || !portVecs[to]) continue

          const p1 = portVecs[from]
          const p2 = portVecs[to]

          // Arc apex — push midpoint out from sphere center
          const mid = p1.clone().add(p2).multiplyScalar(0.5)
          const dist = p1.distanceTo(p2)
          mid.normalize().multiplyScalar(RADIUS + dist * 0.45)

          const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)

          // Static dim line
          const pts = curve.getPoints(80)
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), arcLineMat.clone()))

          // Traveling head
          const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0x60a5fa }))
          group.add(head)

          arcStates.push({ curve, progress: Math.random(), speed: 0.0015 + Math.random() * 0.001, head })
        }

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4))
        const sun = new THREE.DirectionalLight(0xffffff, 1.6)
        sun.position.set(5, 3, 6)
        scene.add(sun)
        const rim = new THREE.DirectionalLight(0x3b82f6, 0.6)
        rim.position.set(-6, 0, -3)
        scene.add(rim)

        // ResizeObserver
        const ro = new ResizeObserver(() => {
          if (!container || !renderer) return
          const w = container.clientWidth
          const h = container.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        })
        ro.observe(container)

        // Animate
        const animate = () => {
          animId = requestAnimationFrame(animate)
          group.rotation.y += 0.0012

          for (const arc of arcStates) {
            arc.progress = (arc.progress + arc.speed) % 1
            const pos = arc.curve.getPoint(arc.progress)
            arc.head.position.copy(pos)
          }

          renderer!.render(scene, camera)
        }
        animate()

        return () => {
          ro.disconnect()
        }
      } catch {
        setFailed(true)
      }
    }

    const cleanup = run()
    return () => {
      cancelAnimationFrame(animId)
      cleanup.then(fn => fn?.())
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }
  }, [])

  if (failed) return <GlobeFallback />

  return <div ref={mountRef} className="w-full h-full" />
}
