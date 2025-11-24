import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Add a base tag to ensure all relative URLs are resolved correctly */}
        <base
          href={process.env.NEXT_PUBLIC_BASE_PATH ? `${process.env.NEXT_PUBLIC_BASE_PATH}/` : '/'}
        />
        {/* Add a script to fix paths at runtime */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              const repoName = 'mita-state-self-assessment-tool';
              const path = window.location.pathname;
              const repoIndex = path.indexOf(repoName);
              
              if (repoIndex !== -1) {
                const basePath = '/' + repoName;
                
                // Update base href
                const baseElement = document.querySelector('base');
                if (baseElement) {
                  baseElement.setAttribute('href', basePath + '/');
                }
                
                // Fix CSS links
                document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                  if (link.href.includes('/_next/') && !link.href.includes(basePath)) {
                    link.href = link.href.replace('/_next/', basePath + '/_next/');
                  }
                });
                
                // Fix script sources
                document.querySelectorAll('script').forEach(script => {
                  if (script.src && script.src.includes('/_next/') && !script.src.includes(basePath)) {
                    script.src = script.src.replace('/_next/', basePath + '/_next/');
                  }
                });
              }
            })();
          `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
