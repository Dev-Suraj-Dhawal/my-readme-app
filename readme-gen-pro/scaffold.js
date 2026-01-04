const fs = require('fs');
const path = require('path');

// The Name of your App
const rootDir = 'readme-gen-pro';

// The Exact Hierarchy you requested
const structure = {
  'public/assets': {},
  'src/app/api/generate': {},
  'src/app/editor/[id]': {},
  'src/components/ui': {},
  'src/lib': {},
  'src/types': {},
  'src/utils': {},
  'db': {},
};

// Files to create with initial content
const files = {
  '.env.local': 'GITHUB_TOKEN=\nOPENAI_API_KEY=\nNEXT_PUBLIC_URL=http://localhost:3000',
  
  'package.json': `{
  "name": "readme-gen-pro",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@ai-sdk/openai": "^0.0.10",
    "@radix-ui/react-slot": "^1.0.2",
    "ai": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.300.0",
    "next": "14.1.0",
    "octokit": "^3.1.2",
    "react": "^18",
    "react-dom": "^18",
    "react-markdown": "^9.0.1",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}`,

  'tsconfig.json': `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,

  'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

export default nextConfig;`,

  'src/lib/utils.ts': `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,

  'src/types/index.ts': `export interface RepoData {
  owner: string;
  repo: string;
  description?: string;
  language?: string;
  fileTree: string[];
}`,

  'src/lib/github.ts': `import { Octokit } from "octokit";

// Industry Standard: Use Octokit for robust GitHub interactions
export const getRepoDetails = async (url: string) => {
    // Logic to parse "github.com/owner/repo"
    console.log("Fetching repo metadata...");
    return { name: "Sample Repo", fileTree: ["package.json", "src/index.ts"] };
};`,

  'src/lib/ai-agent.ts': `import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const generateReadme = async (context: string) => {
  // This is where the LLM magic happens
  // We use Vercel AI SDK for streaming responses
  return "# Generated README\\n\\nInstallation...";
};`,
  
  'src/app/layout.tsx': `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitDocs Pro | AI Readme Generator",
  description: "Generate industry-standard READMEs in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,

  'src/app/page.tsx': `import Link from 'next/link';
import { ArrowRight, Github, Wand2, Terminal } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      
      {/* Hero Section */}
      <div className="z-10 max-w-5xl w-full items-center justify-center flex flex-col text-center gap-8">
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80">
          v1.0 Public Beta
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 pb-2">
          Documentation for <br/> 
          <span className="text-slate-900 dark:text-slate-100">Developers who code.</span>
        </h1>
        
        <p className="max-w-[42rem] leading-normal text-slate-500 sm:text-xl sm:leading-8">
          Turn your GitHub repository into a visual, industry-standard README.md in seconds. 
          We parse your code, verify installation steps, and generate architecture diagrams.
        </p>

        {/* Input Simulation */}
        <div className="w-full max-w-md p-2 bg-white rounded-lg shadow-xl border border-slate-200 flex gap-2">
          <div className="flex-1 flex items-center px-3 bg-slate-50 rounded border border-slate-100">
            <Github className="w-5 h-5 text-slate-400 mr-2" />
            <input 
              disabled 
              placeholder="github.com/yourname/awesome-project" 
              className="bg-transparent w-full outline-none text-sm text-slate-600"
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
            <Wand2 className="w-4 h-4" />
            Generate
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-left">
          <FeatureCard 
            icon={<Terminal className="w-6 h-6 text-blue-500" />}
            title="101% Verified Commands"
            desc="We don't guess. We verify that npm install actually builds your project."
          />
          <FeatureCard 
            icon={<Github className="w-6 h-6 text-purple-500" />}
            title="Tree-Sitter Parsing"
            desc="We read the code structure, not just the text, to understand logic."
          />
          <FeatureCard 
            icon={<Wand2 className="w-6 h-6 text-indigo-500" />}
            title="Visual Architecture"
            desc="Auto-generated Mermaid.js charts explaining your system flow."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm hover:shadow-md transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2 text-slate-900">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}`,

  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
`
};

// Execution Function
async function scaffold() {
  console.log(`🚀 Initializing ${rootDir}...`);

  // 1. Create Root Directory
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);

  // 2. Create Sub-directories
  for (const [dir] of Object.entries(structure)) {
    const fullPath = path.join(rootDir, dir);
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  }

  // 3. Create Files
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filePath);
    fs.writeFileSync(fullPath, content);
    console.log(`📄 Created: ${filePath}`);
  }

  console.log('\n✨ Setup Complete! Follow the instructions in guide.md to start.');
}

scaffold();