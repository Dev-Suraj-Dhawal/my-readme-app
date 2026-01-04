import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { generateReadme, generateReadmeStreaming, generateReadmeWithFallback } from '../../../lib/ai-agent';

// ============================================
// TYPES
// ============================================
interface RepoAnalysis {
  metadata: {
    owner: string;
    repo: string;
    description: string;
    stars: number;
    language: string;
    topics: string[];
    license: string | null;
  };
  structure: {
    hasPackageJson: boolean;
    hasDockerfile: boolean;
    hasTsConfig: boolean;
    mainFiles: string[];
  };
  packageInfo?: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };
  readmeExists: boolean;
}

// ============================================
// GITHUB REPOSITORY ANALYZER
// ============================================
async function analyzeRepository(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepoAnalysis> {
  // Fetch repo metadata and root contents in parallel
  const [repoMeta, contents] = await Promise.all([
    octokit.rest.repos.get({ owner, repo }),
    octokit.rest.repos.getContent({ owner, repo, path: '' }),
  ]);

  const fileList = Array.isArray(contents.data) ? contents.data : [contents.data];
  const fileNames = fileList.map((f: any) => f.name);

  // Detect key files
  const structure = {
    hasPackageJson: fileNames.includes('package.json'),
    hasDockerfile: fileNames.includes('Dockerfile') || fileNames.includes('docker-compose.yml'),
    hasTsConfig: fileNames.includes('tsconfig.json'),
    mainFiles: fileNames.filter((name: string) => 
      ['package.json', 'tsconfig.json', 'Dockerfile', '.env.example', 'requirements.txt'].includes(name)
    ),
  };

  const readmeExists = fileNames.some((name: string) => 
    /^readme\.md$/i.test(name)
  );

  // Fetch package.json if it exists (for deep analysis)
  let packageInfo: RepoAnalysis['packageInfo'] | undefined;
  if (structure.hasPackageJson) {
    try {
      const pkgContent = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'package.json',
      });

      if ('content' in pkgContent.data) {
        const decodedContent = Buffer.from(pkgContent.data.content, 'base64').toString('utf-8');
        const pkg = JSON.parse(decodedContent);
        packageInfo = {
          name: pkg.name || repo,
          version: pkg.version || '1.0.0',
          dependencies: pkg.dependencies || {},
          devDependencies: pkg.devDependencies || {},
          scripts: pkg.scripts || {},
        };
      }
    } catch (err) {
      console.warn('Failed to fetch package.json:', err);
    }
  }

  return {
    metadata: {
      owner,
      repo,
      description: repoMeta.data.description || 'No description provided',
      stars: repoMeta.data.stargazers_count,
      language: repoMeta.data.language || 'Unknown',
      topics: repoMeta.data.topics || [],
      license: repoMeta.data.license?.name || null,
    },
    structure,
    packageInfo,
    readmeExists,
  };
}

// ============================================
// BUILD RICH CONTEXT FOR AI
// ============================================
function buildAIContext(analysis: RepoAnalysis): string {
  const { metadata, structure, packageInfo } = analysis;

  let context = `# Repository Analysis for ${metadata.owner}/${metadata.repo}\n\n`;
  context += `## Metadata\n`;
  context += `- Description: ${metadata.description}\n`;
  context += `- Primary Language: ${metadata.language}\n`;
  context += `- Stars: ${metadata.stars}\n`;
  context += `- License: ${metadata.license || 'None'}\n`;
  
  if (metadata.topics.length > 0) {
    context += `- Topics: ${metadata.topics.join(', ')}\n`;
  }

  context += `\n## Project Structure\n`;
  context += `- Framework: ${structure.hasTsConfig ? 'TypeScript' : 'JavaScript'}\n`;
  context += `- Containerized: ${structure.hasDockerfile ? 'Yes (Docker)' : 'No'}\n`;

  if (packageInfo) {
    context += `\n## Package Information\n`;
    context += `- Name: ${packageInfo.name}\n`;
    context += `- Version: ${packageInfo.version}\n`;
    
    const depCount = Object.keys(packageInfo.dependencies).length;
    const devDepCount = Object.keys(packageInfo.devDependencies).length;
    
    context += `- Dependencies: ${depCount} production, ${devDepCount} development\n`;
    
    if (depCount > 0) {
      const topDeps = Object.keys(packageInfo.dependencies).slice(0, 10);
      context += `- Key Dependencies: ${topDeps.join(', ')}\n`;
    }

    if (Object.keys(packageInfo.scripts).length > 0) {
      context += `\n### Available Scripts\n`;
      Object.entries(packageInfo.scripts).forEach(([name, cmd]) => {
        context += `- \`${name}\`: ${cmd}\n`;
      });
    }
  }

  context += `\n## README Status\n`;
  context += `- Existing README: ${analysis.readmeExists ? 'Yes (will be enhanced)' : 'No (will be created)'}\n`;

  return context;
}

// ============================================
// STANDARD POST ENDPOINT (NON-STREAMING)
// ============================================
export async function POST(req: Request) {
  try {
    const { repoUrl, style = 'standard', streaming = false } = await req.json();

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    // Parse GitHub URL (supports multiple formats)
    const cleaned = repoUrl
      .replace(/^git@github.com:/, 'https://github.com/')
      .replace(/\.git$/i, '')
      .replace(/\/+$/g, '');

    const parts = cleaned.replace('https://github.com/', '').split('/');
    const owner = parts[0];
    const repo = parts[1];

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 });
    }

    // Validate GitHub token
    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({ 
        error: 'Server misconfiguration: GITHUB_TOKEN not set' 
      }, { status: 500 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Deep repository analysis
    const analysis = await analyzeRepository(octokit, owner, repo);
    const context = buildAIContext(analysis);

    // Use multi-model fallback for maximum reliability
    const { markdown, modelUsed } = await generateReadmeWithFallback(context, {
      style: style as 'minimal' | 'standard' | 'enterprise',
      includeArchitecture: style === 'enterprise',
      includeSecurity: style === 'enterprise',
      includeContributing: style === 'enterprise' || style === 'standard',
    });

    return NextResponse.json({ 
      markdown,
      analysis: {
        language: analysis.metadata.language,
        hasPackageJson: analysis.structure.hasPackageJson,
        readmeExists: analysis.readmeExists,
        modelUsed,
      }
    });

  } catch (error: any) {
    console.error('Error generating README:', error);

    // Enhanced error responses
    if (error.status === 404) {
      return NextResponse.json({ 
        error: 'Repository not found or is private' 
      }, { status: 404 });
    } else if (error.status === 403) {
      return NextResponse.json({ 
        error: 'GitHub API rate limit exceeded or insufficient permissions' 
      }, { status: 403 });
    } else if (error.code === 'AUTH_ERROR') {
      return NextResponse.json({ 
        error: 'Invalid API keys. Please check server configuration.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: error?.message || 'Failed to generate README' 
    }, { status: 500 });
  }
}

// ============================================
// STREAMING ENDPOINT (REAL-TIME GENERATION)
// ============================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repoUrl = searchParams.get('repoUrl');
  const style = searchParams.get('style') || 'standard';

  if (!repoUrl) {
    return NextResponse.json({ error: 'repoUrl query parameter required' }, { status: 400 });
  }

  try {
    // Parse GitHub URL
    const cleaned = repoUrl
      .replace(/^git@github.com:/, 'https://github.com/')
      .replace(/\.git$/i, '')
      .replace(/\/+$/g, '');

    const parts = cleaned.replace('https://github.com/', '').split('/');
    const owner = parts[0];
    const repo = parts[1];

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const analysis = await analyzeRepository(octokit, owner, repo);
    const context = buildAIContext(analysis);

    // Create streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start async generation
    (async () => {
      try {
        await generateReadmeStreaming(
          context,
          {
            style: style as 'minimal' | 'standard' | 'enterprise',
            includeArchitecture: style === 'enterprise',
          },
          async (chunk) => {
            // Stream each chunk to the client
            await writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
        );

        // Signal completion
        await writer.write(encoder.encode('data: {"done": true}\n\n'));
        await writer.close();
      } catch (error: any) {
        await writer.write(encoder.encode(`data: {"error": "${error.message}"}\n\n`));
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-transform',
      },
    });

  } catch (error: any) {
    console.error('Streaming error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Streaming failed' 
    }, { status: 500 });
  }
}
