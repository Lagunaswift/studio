export function PageWrapper({ children, title, className = '', maxWidth = 'max-w-7xl' }) {
    const wrapperClasses = {
        'container': 'container mx-auto',
        'max-w-5xl': 'max-w-5xl mx-auto',
        'max-w-6xl': 'max-w-6xl mx-auto',
        'max-w-7xl': 'max-w-7xl mx-auto',
        'max-w-full': 'w-full',
    };
    const appliedMaxWidthClass = wrapperClasses[maxWidth] || wrapperClasses['container'];
    return (<div className={`${appliedMaxWidthClass} px-4 py-8 ${className}`}>
      {title && (<h1 className="text-3xl font-bold font-headline text-primary mb-8 border-b-2 border-accent pb-2">
          {title}
        </h1>)}
      {children}
    </div>);
}
