import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SummaryRequest {
  sessionId: string;
  userId: string;
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

    const { sessionId, userId }: SummaryRequest = await req.json();

    // Get session data
    const { data: session, error: sessionError } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Get trades for this session
    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (tradesError) {
      console.error('Trades error:', tradesError);
      throw new Error('Failed to fetch trades');
    }

    // Calculate session statistics
    const totalTrades = trades?.length || 0;
    const totalProfit = trades?.reduce((sum, trade) => sum + trade.profit_loss, 0) || 0;
    const winningTrades = trades?.filter(trade => trade.profit_loss > 0).length || 0;
    const losingTrades = trades?.filter(trade => trade.profit_loss < 0).length || 0;
    const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
    const totalMargin = trades?.reduce((sum, trade) => sum + trade.margin, 0) || 0;
    const avgROI = totalTrades ? trades.reduce((sum, trade) => sum + trade.roi, 0) / totalTrades : 0;

    const systemPrompt = `You are Sydney, an AI trading analyst. Generate a comprehensive and personalized summary for this trading session.

Session Details:
- Name: ${session.name}
- Initial Capital: $${session.initial_capital}
- Current Capital: $${session.current_capital}
- Created: ${new Date(session.created_at).toLocaleDateString()}

Trading Performance:
- Total Trades: ${totalTrades}
- Net P/L: $${totalProfit.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}%
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}
- Total Margin Used: $${totalMargin.toFixed(2)}
- Average ROI: ${avgROI.toFixed(2)}%

Individual Trades:
${JSON.stringify(trades, null, 2)}

Please provide a warm, personalized summary that includes:

1. **Performance Overview**: A friendly summary of how the session went
2. **Key Insights**: Notable patterns, strengths, and areas for improvement
3. **Psychological Analysis**: Observations about trading behavior and mindset based on trade patterns and comments
4. **Risk Assessment**: Any concerning patterns like overtrading or revenge trading
5. **Personalized Recommendations**: Specific, actionable advice for future sessions

Write in a conversational, supportive tone as Sydney. Keep it under 500 words but make it comprehensive and valuable.`;

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
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${openAIResponse.status}`);
    }

    const aiData = await openAIResponse.json();
    const summary = aiData.choices[0]?.message?.content || 'Unable to generate summary.';

    return new Response(
      JSON.stringify({ 
        summary,
        usage: aiData.usage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating session summary:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate session summary',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});