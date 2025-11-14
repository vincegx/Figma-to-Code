/**
 * TechnicalAnalysisViewer - Composant réutilisable pour afficher l'analyse technique
 * Utilisé par ExportFigmaDetailPage et ResponsiveMergeDetailPage
 * Rend le markdown avec react-markdown pour un affichage formaté
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTranslation } from '../../i18n/I18nContext'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface TechnicalAnalysisViewerProps {
  analysis: string
  title?: string
}

export function TechnicalAnalysisViewer({ analysis, title = 'analysis.md' }: TechnicalAnalysisViewerProps) {
  const { t } = useTranslation()

  if (!analysis) {
    return (
      <Card className="p-12 text-center">
        <div className="mb-4 text-6xl">📄</div>
        <h3 className="mb-2 text-xl font-semibold">{t('detail.technical.no_analysis_title')}</h3>
        <p className="text-muted-foreground">{t('detail.technical.no_analysis_text')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="mb-1 font-semibold">{t('detail.technical.banner_title')}</p>
          <p className="text-sm">{t('detail.technical.banner_text')}</p>
        </AlertDescription>
      </Alert>

      {/* Markdown rendered */}
      <Card className="overflow-hidden min-w-0">
        <div className="flex items-center justify-between border-b bg-muted px-6 py-3">
          <h3 className="font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {analysis.split('\n').length} lines
          </span>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="prose prose-sm dark:prose-invert max-w-none p-6 prose-pre:bg-muted prose-pre:text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Code blocks avec syntax highlighting
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match

                  if (isInline) {
                    return (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    )
                  }

                  return (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  )
                },
                // Tables avec style amélioré
                table({ children, ...props }) {
                  return (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props}>
                        {children}
                      </table>
                    </div>
                  )
                },
                thead({ children, ...props }) {
                  return (
                    <thead className="bg-muted" {...props}>
                      {children}
                    </thead>
                  )
                },
                th({ children, ...props }) {
                  return (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider" {...props}>
                      {children}
                    </th>
                  )
                },
                td({ children, ...props }) {
                  return (
                    <td className="px-4 py-3 text-sm border-t border-border" {...props}>
                      {children}
                    </td>
                  )
                },
                // Headers avec meilleur spacing
                h1({ children, ...props }) {
                  return <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b" {...props}>{children}</h1>
                },
                h2({ children, ...props }) {
                  return <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b" {...props}>{children}</h2>
                },
                h3({ children, ...props }) {
                  return <h3 className="text-xl font-semibold mt-6 mb-3" {...props}>{children}</h3>
                },
                h4({ children, ...props }) {
                  return <h4 className="text-lg font-semibold mt-4 mb-2" {...props}>{children}</h4>
                },
                // Blockquotes avec style
                blockquote({ children, ...props }) {
                  return (
                    <blockquote className="border-l-4 border-primary bg-muted/50 pl-4 py-2 my-4 italic" {...props}>
                      {children}
                    </blockquote>
                  )
                },
                // Lists
                ul({ children, ...props }) {
                  return <ul className="list-disc list-inside space-y-1 my-4" {...props}>{children}</ul>
                },
                ol({ children, ...props }) {
                  return <ol className="list-decimal list-inside space-y-1 my-4" {...props}>{children}</ol>
                },
                // Links
                a({ children, href, ...props }) {
                  return (
                    <a
                      href={href}
                      className="text-primary hover:underline font-medium"
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      {...props}
                    >
                      {children}
                    </a>
                  )
                },
                // Horizontal rule
                hr({ ...props }) {
                  return <hr className="my-8 border-border" {...props} />
                }
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
