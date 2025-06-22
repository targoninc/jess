export async function baseHtml(req: Request) {
    const title = "Jess Docs";
    const description = "A framework only as complex as needed";
    const image = "";

    return `<!DOCTYPE html>
<html lang="en">
<head id="header">
    <title>${title}</title>

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <meta name="theme-color" content="#202025">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- Preconnect to JS Delivr -->
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    
    <!-- Preconnect to Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    
    <!-- Material Symbols Filled -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/targoninc/jess-components@0.0.8/src/src/jess-components.css"/>
    
    <link rel="stylesheet" type="text/css" href="/css/hljs-an-old-hope.css"/>
    <link rel="stylesheet" type="text/css" href="/css/reset.css"/>
    <link rel="stylesheet" type="text/css" href="/css/index.css"/>
    <link rel="stylesheet" type="text/css" href="/css/components.css"/>
    
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:description" content="${description}"/>
    <meta name="twitter:title" content="${title}"/>
    <meta name="twitter:image" content="${image}"/>

    <meta property="og:type" content="website"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${description}"/>
    <meta property="og:image" content="${image}"/>
    <script src="/index.js" type="module"></script>
</head>
<body>
</body>
</html>`;
}