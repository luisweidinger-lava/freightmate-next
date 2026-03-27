'use client'

import { useState, useMemo } from 'react'
import sanitizeHtml from 'sanitize-html'
import { Code, Eye, AlertCircle } from 'lucide-react'

// ─── Sanitize config — email-safe allowlist ───────────────────────────────────

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'div', 'p', 'br', 'span', 'a', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'hr', 'font',
    'center', 'small', 'sub', 'sup',
  ],
  allowedAttributes: {
    'a':   ['href', 'name', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'style'],
    'td':  ['colspan', 'rowspan', 'align', 'valign', 'style', 'width'],
    'th':  ['colspan', 'rowspan', 'align', 'valign', 'style', 'width'],
    'table': ['cellpadding', 'cellspacing', 'border', 'width', 'style'],
    '*':   ['style', 'class', 'dir', 'align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Force all links to open in new tab safely
  transformTags: {
    'a': (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  },
}

// ─── HTML detection ───────────────────────────────────────────────────────────

function isHtml(text: string): boolean {
  return /<(html|body|div|p|br|span|table|tr|td|ul|ol|li|h[1-6]|blockquote|font|center)/i.test(text)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MailBodyRendererProps {
  body:    string | null
  preview: string | null
}

export default function MailBodyRenderer({ body, preview }: MailBodyRendererProps) {
  const [showSource, setShowSource] = useState(false)
  const [renderError, setRenderError] = useState(false)

  const content = body || preview || ''

  const { html, isHtmlContent } = useMemo(() => {
    if (!content) return { html: '', isHtmlContent: false }
    const htmlContent = isHtml(content)
    if (!htmlContent) return { html: content, isHtmlContent: false }

    try {
      const sanitized = sanitizeHtml(content, SANITIZE_OPTIONS)
      return { html: sanitized, isHtmlContent: true }
    } catch {
      setRenderError(true)
      return { html: content, isHtmlContent: false }
    }
  }, [content])

  if (!content) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <p className="text-sm">(no content)</p>
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">This email could not be rendered correctly.</p>
          <button
            onClick={() => { setRenderError(false); setShowSource(true) }}
            className="text-red-500 underline text-xs mt-1"
          >
            View raw source
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Source toggle — only show for HTML emails */}
      {isHtmlContent && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowSource(s => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showSource ? <Eye size={12} /> : <Code size={12} />}
            {showSource ? 'Formatted view' : 'View source'}
          </button>
        </div>
      )}

      {showSource ? (
        /* Raw source view */
        <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
          {content}
        </pre>
      ) : isHtmlContent ? (
        /* Rendered HTML */
        <div
          className="email-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        /* Plain text */
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      )}
    </div>
  )
}
