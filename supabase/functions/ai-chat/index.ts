import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId: string;
}

interface Trade {
  id: string;
  session_id: string;
  margin: number;
  roi: number;
  entry_side: 'Long' | 'Short';
  profit_loss: number;
  comments?: string;
  created_at: string;
}

interface TradingSession {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  current_capital: number;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message, sessionId, userId }: ChatRequest = await req.json();

    // Get user's trading data
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Sessions error:', sessionsError);
      throw new Error('Failed to fetch sessions');
    }

    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select(`
        *,
        trading_sessions!inner(name, user_id)
      `)
      .eq('trading_sessions.user_id', userId)
      .order('created_at', { ascending: false });

    if (tradesError) {
      console.error('Trades error:', tradesError);
      throw new Error('Failed to fetch trades');
    }

    // Prepare context for AI
    const tradingContext = {
      sessions: sessions || [],
      trades: trades || [],
      totalSessions: sessions?.length || 0,
      totalTrades: trades?.length || 0,
      currentDate: new Date().toISOString(),
    };

    // Calculate some basic stats for context
    const totalProfit = trades?.reduce((sum, trade) => sum + trade.profit_loss, 0) || 0;
    const winningTrades = trades?.filter(trade => trade.profit_loss > 0).length || 0;
    const losingTrades = trades?.filter(trade => trade.profit_loss < 0).length || 0;
    const winRate = trades?.length ? (winningTrades / trades.length) * 100 : 0;

    const systemPrompt = `You are Sydney, an AI trading assistant for Laxmi Chit Fund's trading analytics platform. You are friendly, helpful, and have a warm personality.

User's Trading Data Summary:
- Total Sessions: ${tradingContext.totalSessions}
- Total Trades: ${tradingContext.totalTrades}
- Total P/L: $${totalProfit.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}%
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}

Recent Sessions: ${JSON.stringify(sessions?.slice(0, 5), null, 2)}
Recent Trades: ${JSON.stringify(trades?.slice(0, 10), null, 2)}

You can:
1. Analyze their trading performance and provide insights
2. Answer questions about specific trades or sessions
3. Offer psychological feedback on trading patterns
4. Chat freely like ChatGPT (jokes, general questions, etc.)
5. Detect risky behavior (overtrading, revenge trading)
6. Infer user mindset from trade comments
7. Give personalized tips and recommendations
8. Answer questions about gold prices, market trends, etc.

Be conversational, supportive, and provide actionable advice. Use specific data from their trading history when relevant. If they ask non-trading questions, feel free to chat normally.

Current date: ${new Date().toLocaleDateString()}`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const aiMessage = aiData.choices[0]?.message?.content || 'Sorry, I could not process your request.';

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        usage: aiData.usage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});