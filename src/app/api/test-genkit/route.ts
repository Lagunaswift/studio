import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing Genkit configuration...');
    
    // Test environment variables
    const envTest = {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasGoogleAIKey: !!process.env.GOOGLE_AI_API_KEY,
      keyLength: (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY)?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      cwd: process.cwd(),
    };

    console.log('🔧 Environment test:', envTest);

    // Test Genkit import and initialization
    let genkitTest;
    try {
      console.log('📦 Importing Genkit AI module...');
      const { ai } = await import('@/ai/genkit');
      
      console.log('✅ Genkit AI module imported successfully');
      
      // Test prompt loading
      try {
        console.log('🔍 Testing prompt access...');
        const suggestMealPlanPrompt = ai.prompt('suggestMealPlan');
        
        genkitTest = {
          genkitImported: true,
          promptAccessible: !!suggestMealPlanPrompt,
          promptType: typeof suggestMealPlanPrompt,
          error: null
        };
        
        console.log('✅ Prompt test completed:', genkitTest);
        
      } catch (promptError: any) {
        console.error('❌ Prompt access failed:', promptError);
        
        genkitTest = {
          genkitImported: true,
          promptAccessible: false,
          promptType: 'undefined',
          error: promptError.message
        };
      }
      
    } catch (importError: any) {
      console.error('❌ Genkit import failed:', importError);
      
      genkitTest = {
        genkitImported: false,
        promptAccessible: false,
        promptType: 'undefined',
        error: importError.message
      };
    }

    // Test file system access to prompts directory
    let fileSystemTest;
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const promptsDir = path.join(process.cwd(), 'prompts');
      const promptFile = path.join(promptsDir, 'suggestMealPlan.prompt');
      
      fileSystemTest = {
        promptsDirExists: fs.existsSync(promptsDir),
        promptFileExists: fs.existsSync(promptFile),
        promptsDir,
        promptFile
      };
      
      if (fs.existsSync(promptsDir)) {
        const files = fs.readdirSync(promptsDir);
        fileSystemTest.filesInPromptsDir = files;
      }
      
    } catch (fsError: any) {
      fileSystemTest = {
        error: fsError.message,
        accessible: false
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        environment: envTest,
        genkit: genkitTest,
        fileSystem: fileSystemTest
      }
    });

  } catch (error: any) {
    console.error('🚨 Genkit test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.substring(0, 500),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}