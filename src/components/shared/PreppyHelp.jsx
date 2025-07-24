'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { askPreppyAboutApp } from '@/ai/flows/app-guide-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/context/AppContext';
import { ProFeature } from './ProFeature';
export function PreppyHelp() {
    const { isSubscribed } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async () => {
        if (!question.trim())
            return;
        setIsLoading(true);
        setError(null);
        setAnswer(null);
        try {
            const input = { question };
            const result = await askPreppyAboutApp(input);
            setAnswer(result.answer);
        }
        catch (e) {
            console.error("Error asking Preppy for help:", e);
            setError("Sorry, I had trouble finding an answer. Please try rephrasing your question.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            // Reset state when closing
            setQuestion('');
            setAnswer(null);
            setError(null);
            setIsLoading(false);
        }
    };
    const renderContent = () => {
        if (!isSubscribed) {
            return <ProFeature featureName="Preppy App Help" description="Have a question about the app or general nutrition? Ask Preppy! This AI assistant is your personal guide." hideWrapper/>;
        }
        return (<>
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl font-headline text-primary">
            <Bot className="w-6 h-6 mr-2 text-accent"/>
            Ask Me Anything
          </DialogTitle>
          <DialogDescription>
            Have a question about how the app works? I'm here to help!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Textarea placeholder="e.g., How do I add a recipe to my meal plan?" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} disabled={isLoading}/>
          {isLoading && (<div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-accent"/>
              <p className="ml-2 text-muted-foreground">I'm thinking...</p>
            </div>)}
          {error && (<Alert variant="destructive">
              <AlertTitle>Oops!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>)}
          {answer && (<div className="p-4 bg-secondary/50 rounded-md space-y-2">
              <h4 className="font-semibold flex items-center text-primary">
                <Sparkles className="w-4 h-4 mr-2 text-accent"/>
                My Answer
              </h4>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{answer}</p>
            </div>)}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isLoading || !question.trim()}>
            <Send className="mr-2 h-4 w-4"/> Ask Question
          </Button>
        </DialogFooter>
      </>);
    };
    return (<Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center" aria-label="Ask me for help">
          <Bot className="h-7 w-7"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {renderContent()}
      </DialogContent>
    </Dialog>);
}
