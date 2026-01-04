import Bytez from "bytez.js";

// ============================================
// CUSTOM ERROR CLASSES
// ============================================
class ReadmeGenerationError extends Error {
  constructor(
    message: string,
    public code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'INVALID_OUTPUT' | 'UNKNOWN',
    public retryable: boolean,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ReadmeGenerationError';
  }
}

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================
async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }

      // Calculate delay with jitter to prevent thundering herd
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * exponentialDelay * 0.3; // 30% jitter
      const totalDelay = exponentialDelay + jitter;

      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      attempt++;
    }
  }
}

// ============================================
// CONFIGURATION INTERFACE
// ============================================
interface ReadmeConfig {
  style?: 'minimal' | 'standard' | 'enterprise';
  includeArchitecture?: boolean;
  includeSecurity?: boolean;
  includeContributing?: boolean;
  model?: string;
  temperature?: number;
  streaming?: boolean;
}

// ============================================
// ENHANCED PROMPT BUILDER
// ============================================
function buildSystemPrompt(config: ReadmeConfig): string {
  const basePrompt = `You are a Senior Principal Engineer at a top-tier tech firm (like Vercel or Stripe). 
Your goal is to generate an ELITE, industry-standard README.md.

STYLE GUIDELINES:
- Use modern SVG icons (e.g., skill-icons or simple icons) for the Tech Stack.
- Include professional Shields.io badges (Stars, Forks, License, Version).
- Structure with deep hierarchy: Features (with emojis), Roadmap, Architecture (Mermaid), and Detailed Installation.
- Create a "Quick Start" vs "Full Documentation" section.
- Use clean Markdown tables for API documentation or Config options.
- Ensure any code blocks are accurately syntax-highlighted.
- NEVER include meta-talk like "Here is your readme". ONLY output the raw markdown.`;

  const styleAdditions = {
    minimal: '\n- Keep it concise: 5-7 sections max, focus on Quick Start.',
    standard: '\n- Balance detail with readability: Include all essential sections.',
    enterprise: '\n- Maximum detail: Architecture diagrams, security policies, CI/CD, deployment guides, monitoring setup.'
  };

  let enhancedPrompt = basePrompt + (styleAdditions[config.style || 'standard'] || '');

  if (config.includeArchitecture) {
    enhancedPrompt += '\n- MUST include a Mermaid architecture diagram showing system components.';
  }

  if (config.includeSecurity) {
    enhancedPrompt += '\n- MUST include a Security section with vulnerability reporting and best practices.';
  }

  if (config.includeContributing) {
    enhancedPrompt += '\n- MUST include detailed Contributing guidelines with PR process and code standards.';
  }

  return enhancedPrompt;
}

// ============================================
// OUTPUT VALIDATION
// ============================================
function validateReadmeOutput(markdown: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check minimum length
  if (markdown.length < 200) {
    errors.push('README is too short (less than 200 characters)');
  }

  // Check for essential sections (at least 2 headers)
  const headerMatches = markdown.match(/^#{1,3}\s+.+$/gm);
  if (!headerMatches || headerMatches.length < 2) {
    errors.push('Missing essential section headers');
  }

  // Check for unclosed code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push('Unclosed code block detected');
  }

  // Check for AI meta-commentary leakage
  const metaCommentary = /here is|i have generated|i've created|below is/gi;
  if (metaCommentary.test(markdown.slice(0, 500))) {
    errors.push('AI meta-commentary detected in output');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// STREAMING README GENERATOR
// ============================================
export const generateReadmeStreaming = async (
  prompt: string,
  config: ReadmeConfig = {},
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const BYTEZ_KEY = process.env.BYTEZ_API_KEY || process.env.OPENAI_API_KEY;

  if (!BYTEZ_KEY) {
    throw new ReadmeGenerationError(
      'Missing BYTEZ_API_KEY in environment variables',
      'AUTH_ERROR',
      false
    );
  }

  try {
    const sdk = new Bytez(BYTEZ_KEY);
    const modelName = config.model || "openai/gpt-4o";
    const model = sdk.model(modelName);

    const systemPrompt = buildSystemPrompt(config);

    // Enable streaming for real-time feedback
    const response = await model.run(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze the following project data and build a high-conversion, professional README:\n${prompt}`
        }
      ],
      { 
        stream: true,
        temperature: config.temperature || 0.7
      }
    );

    let fullMarkdown = "";
    
    // Handle streaming response
    if (response && typeof response === 'object' && Symbol.asyncIterator in response) {
      for await (const chunk of response as AsyncIterable<any>) {
        const text = typeof chunk === 'string' ? chunk : chunk.toString();
        fullMarkdown += text;
        if (onChunk) {
          onChunk(text); // Real-time streaming callback
        }
      }
    } else if (typeof response === 'string') {
      fullMarkdown = response;
      if (onChunk) {
        onChunk(response);
      }
    } else if (response && typeof response === 'object' && 'content' in response) {
      fullMarkdown = (response as any).content;
      if (onChunk) {
        onChunk(fullMarkdown);
      }
    }

    // Cleanup
    fullMarkdown = fullMarkdown
      .replace(/^```markdown\n/i, '')
      .replace(/^```\n/i, '')
      .replace(/\n```$/i, '')
      .trim();

    // Validate output
    const validation = validateReadmeOutput(fullMarkdown);
    if (!validation.valid) {
      console.warn('README validation warnings:', validation.errors);
    }

    return fullMarkdown;

  } catch (err: any) {
    // Enhanced error classification
    if (err.message?.includes('rate limit')) {
      throw new ReadmeGenerationError(
        'API rate limit exceeded. Please try again later.',
        'RATE_LIMIT',
        true,
        err
      );
    } else if (err.message?.includes('authentication') || err.message?.includes('API key')) {
      throw new ReadmeGenerationError(
        'Invalid API key or authentication failed',
        'AUTH_ERROR',
        false,
        err
      );
    } else if (err.message?.includes('network') || err.code === 'ECONNREFUSED') {
      throw new ReadmeGenerationError(
        'Network error occurred. Check your connection.',
        'NETWORK_ERROR',
        true,
        err
      );
    } else {
      throw new ReadmeGenerationError(
        `README generation failed: ${err.message}`,
        'UNKNOWN',
        false,
        err
      );
    }
  }
};

// ============================================
// NON-STREAMING WITH RETRY (PRODUCTION DEFAULT)
// ============================================
export const generateReadme = async (
  prompt: string,
  config: ReadmeConfig = {}
): Promise<string> => {
  return withExponentialBackoff(async () => {
    const BYTEZ_KEY = process.env.BYTEZ_API_KEY || process.env.OPENAI_API_KEY;

    if (!BYTEZ_KEY) {
      throw new ReadmeGenerationError(
        'Missing BYTEZ_API_KEY in environment variables',
        'AUTH_ERROR',
        false
      );
    }

    const sdk = new Bytez(BYTEZ_KEY);
    const modelName = config.model || "openai/gpt-4o";
    const model = sdk.model(modelName);

    const systemPrompt = buildSystemPrompt(config);

    const { error, output } = await model.run([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze the following project data and build a high-conversion, professional README:\n${prompt}`
      }
    ]);

    if (error) {
      throw new ReadmeGenerationError(
        `Bytez API Error: ${JSON.stringify(error)}`,
        'UNKNOWN',
        true,
        error
      );
    }

    let finalMarkdown = "";

    // Robust output parsing
    if (typeof output === 'string') {
      finalMarkdown = output;
    } else if (output && typeof output === 'object') {
      if (output.content) {
        finalMarkdown = output.content;
      } else if (output.choices?.[0]?.message?.content) {
        finalMarkdown = output.choices[0].message.content;
      } else {
        finalMarkdown = JSON.stringify(output);
      }
    }

    // Cleanup
    finalMarkdown = finalMarkdown
      .replace(/^```markdown\n/i, '')
      .replace(/^```\n/i, '')
      .replace(/\n```$/i, '')
      .trim();

    // Validate output
    const validation = validateReadmeOutput(finalMarkdown);
    if (!validation.valid) {
      throw new ReadmeGenerationError(
        `Generated README failed validation: ${validation.errors.join(', ')}`,
        'INVALID_OUTPUT',
        true
      );
    }

    return finalMarkdown;
  }, 3, 1000); // 3 retries with 1s base delay
};

// ============================================
// MULTI-MODEL FALLBACK (ULTIMATE RELIABILITY)
// ============================================
export const generateReadmeWithFallback = async (
  prompt: string,
  config: ReadmeConfig = {}
): Promise<{ markdown: string; modelUsed: string }> => {
  const models = [
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'anthropic/claude-3-5-sonnet-20241022',
    'openai/gpt-3.5-turbo'
  ];

  for (const model of models) {
    try {
      console.log(`Attempting README generation with ${model}...`);
      const markdown = await generateReadme(prompt, { ...config, model });
      return { markdown, modelUsed: model };
    } catch (err: any) {
      if (!err.retryable || model === models[models.length - 1]) {
        throw err; // Don't fallback on non-retryable errors or last model
      }
      console.warn(`${model} failed, trying next model...`);
    }
  }

  throw new ReadmeGenerationError(
    'All fallback models failed',
    'UNKNOWN',
    false
  );
};
