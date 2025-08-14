// Vercel-specific environment variable fixes
export function fixVercelPrivateKey(privateKey: string): string {
  if (!privateKey) return privateKey;
  
  console.log('🔧 Applying Vercel-specific private key fixes...');
  console.log('Original key length:', privateKey.length);
  console.log('Original key start:', privateKey.substring(0, 50));
  
  let fixed = privateKey;
  
  // Step 1: Remove any outer quotes that Vercel might add
  fixed = fixed.replace(/^["']|["']$/g, '');
  
  // Step 2: Handle Vercel's double escaping of newlines
  fixed = fixed.replace(/\\\\n/g, '\n');
  
  // Step 3: Replace literal \n with actual newlines (standard fix)
  fixed = fixed.replace(/\\n/g, '\n');
  
  // Step 4: Clean up any extra whitespace
  fixed = fixed.trim();
  
  // Step 5: Ensure proper PEM format structure
  if (fixed.includes('-----BEGIN PRIVATE KEY-----') && 
      fixed.includes('-----END PRIVATE KEY-----')) {
    
    // Split into lines and clean up
    const lines = fixed.split('\n');
    const cleanedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    // Rejoin with proper newlines
    fixed = cleanedLines.join('\n');
    
    // Ensure proper line breaks around headers
    fixed = fixed.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    fixed = fixed.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    
    // Clean up any double newlines
    fixed = fixed.replace(/\n\n+/g, '\n');
  }
  
  console.log('✅ Fixed key length:', fixed.length);
  console.log('Fixed key start:', fixed.substring(0, 50));
  console.log('Fixed key has proper newlines:', fixed.includes('\n'));
  
  return fixed;
}