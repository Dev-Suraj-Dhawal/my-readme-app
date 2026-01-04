import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { generateReadmeWithFallback } from '../../../lib/ai-agent';

export async function POST(req: Request) {
  try {
    // IMPORTANT: Get session using getServerSession from next-auth/next
    const session = await getServerSession(authOptions);

    console.log('Session debug:', {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      user: session?.user?.name
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized. Please sign in with GitHub.' 
      }, { status: 401 });
    }

    if (!session.accessToken) {
      return NextResponse.json({ 
        error: 'Missing GitHub access token. Please sign out and sign in again.' 
      }, { status: 401 });
    }

    const { repoUrl } = await req.json();

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    // Parse GitHub URL
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

    // Use USER'S GitHub token
    const octokit = new Octokit({ auth: session.accessToken });

    // Fetch repo data
    const [repoMeta, contents] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.getContent({ owner, repo, path: '' }),
    ]);

    const fileList = Array.isArray(contents.data) ? contents.data : [contents.data];
    const fileNames = fileList.map((f: any) => f.name);

    // Build context
    let context = `# Repository: ${owner}/${repo}\n`;
    context += `Description: ${repoMeta.data.description || 'No description'}\n`;
    context += `Language: ${repoMeta.data.language || 'Unknown'}\n`;
    context += `Stars: ${repoMeta.data.stargazers_count}\n`;
    context += `Files: ${fileNames.join(', ')}\n`;

    // Generate README with fallback
    const { markdown, modelUsed } = await generateReadmeWithFallback(context);

    return NextResponse.json({ 
      markdown,
      meta: {
        language: repoMeta.data.language,
        modelUsed,
      }
    });

  } catch (error: any) {
    console.error('Error generating README:', error);

    if (error.status === 404) {
      return NextResponse.json({ 
        error: 'Repository not found or you lack access permissions' 
      }, { status: 404 });
    } else if (error.status === 403) {
      return NextResponse.json({ 
        error: 'GitHub API rate limit exceeded' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      error: error?.message || 'Failed to generate README' 
    }, { status: 500 });
  }
}
