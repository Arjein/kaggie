import type { Message } from "../types/message"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.css'

interface MessageItemProps{
    message: Message;
}

export default function SystemMessageItem({message}: MessageItemProps) {
    // Clean markdown text formatting
    const formatText = (text: string): string => {
        // Just return the text as-is since it's already properly formatted
        return text;
    };

    return(
        <div className="flex justify-start px-2 w-full"> 
            <div className="w-full text-text-primary text-adaptive leading-relaxed text-left break-words text-pretty rounded-2xl px-4 py-3 bg-primary/5">
                
                {/* Status indicator */}
                {message.status && (
                    <div className="text-adaptive-sm text-text-muted italic mb-3 flex items-center gap-2">
                        <div className="animate-spin w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full"></div>
                        <span>{message.status}</span>
                    </div>
                )}

                {/* Message content */}
                {message.text && (
                    <div className="text-text-primary">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                            // Proper paragraph spacing with design token colors
                            p: ({children}) => <p className="mb-4 last:mb-0 text-text-primary">{children}</p>,
                            // Code blocks with consistent theming
                            code: ({className, children, ...props}) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';
                                const isInline = !className?.includes('language-');
                                
                                return isInline ? (
                                    <code 
                                        className="bg-bg-overlay text-text-primary px-1.5 py-0.5 rounded text-adaptive-sm font-mono border border-border-subtle" 
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                ) : (
                                    <div className="my-4 rounded-lg overflow-hidden border border-border-subtle">
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={language || 'text'}
                                            PreTag="div"
                                            customStyle={{
                                                margin: 0,
                                                padding: '1rem',
                                                background: 'var(--color-bg-overlay)',
                                                fontSize: 'var(--text-sm)',
                                                lineHeight: '1.5',
                                            }}
                                            codeTagProps={{
                                                style: {
                                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                }
                                            }}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                )
                            },
                            ul: ({children, className}) => {
                                const isNested = className?.includes('task-list') || false;
                                return (
                                    <ul className={`list-disc list-outside ${isNested ? 'ml-4' : 'ml-6'} my-4 space-y-2 text-text-primary`}>
                                        {children}
                                    </ul>
                                );
                            },
                            ol: ({children, className}) => {
                                const isNested = className?.includes('task-list') || false;
                                return (
                                    <ol className={`list-decimal list-outside ${isNested ? 'ml-4' : 'ml-6'} my-4 space-y-2 text-text-primary`}>
                                        {children}
                                    </ol>
                                );
                            },
                            li: ({children}) => (
                                <li className="my-1 text-text-primary leading-relaxed pl-1">
                                    <div className="ml-0">{children}</div>
                                </li>
                            ),
                            strong: ({children}) => <strong className="font-semibold text-text-primary">{children}</strong>,
                            em: ({children}) => <em className="italic text-text-secondary">{children}</em>,
                            a: ({children, href}) => (
                                <a 
                                    href={href} 
                                    className="text-primary underline hover:text-primary-hover transition-colors" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    {children}
                                </a>
                            ),
                            h1: ({children}) => <h1 className="text-adaptive-lg font-bold mt-6 mb-4 first:mt-0 text-text-primary">{children}</h1>,
                            h2: ({children}) => <h2 className="text-adaptive font-bold mt-5 mb-3 first:mt-0 text-text-primary">{children}</h2>,
                            h3: ({children}) => <h3 className="font-bold mt-4 mb-2 first:mt-0 text-text-primary">{children}</h3>,
                            h4: ({children}) => <h4 className="font-semibold mt-3 mb-2 first:mt-0 text-text-primary">{children}</h4>,
                            h5: ({children}) => <h5 className="font-medium mt-2 mb-1 first:mt-0 text-text-primary">{children}</h5>,
                            h6: ({children}) => <h6 className="font-medium mt-2 mb-1 first:mt-0 text-text-secondary">{children}</h6>,
                            blockquote: ({children}) => (
                                <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-text-secondary bg-bg-overlay/30 py-2 rounded-r">
                                    {children}
                                </blockquote>
                            ),
                            table: ({children}) => (
                                <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse border border-border-subtle text-text-primary">
                                        {children}
                                    </table>
                                </div>
                            ),
                            thead: ({children}) => <thead className="bg-bg-overlay">{children}</thead>,
                            tbody: ({children}) => <tbody className="text-text-primary">{children}</tbody>,
                            tr: ({children}) => <tr className="border-b border-border-subtle">{children}</tr>,
                            th: ({children}) => <th className="border border-border-subtle px-3 py-2 text-left font-semibold text-text-primary">{children}</th>,
                            td: ({children}) => <td className="border border-border-subtle px-3 py-2 text-text-primary">{children}</td>,
                            hr: () => <hr className="my-6 border-border-subtle" />,
                        }}
                    >
                        {formatText(message.text)}
                    </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    )
}