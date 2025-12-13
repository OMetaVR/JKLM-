import React, { useEffect, useRef } from 'react';
import debugLogger from '../utils/debugLogger';

const PopsauceTracker = () => {
  const gameStatsRef = useRef({ correct: 0, total: 0, learned: 0, answers: [] });

  useEffect(() => {
    const handleChallenge = () => {
      gameStatsRef.current.total++;
    };

    const handleEndChallenge = (event) => {
      const data = event.detail;
      if (!data) return;

      const wasCorrect = data.submitter && data.fastest;
      if (wasCorrect) {
        gameStatsRef.current.correct++;
        gameStatsRef.current.answers.push({
          answer: data.source,
          wasFirst: data.fastest === data.submitter,
          timestamp: Date.now()
        });
      }
    };

    const handleAnswerLearned = () => {
      gameStatsRef.current.learned++;
    };

    const handleGameEnded = () => {
      const stats = gameStatsRef.current;
      const webhookEnabled = localStorage.getItem('jklm-mini-webhook-enabled') === 'true';
      const logGameResults = localStorage.getItem('jklm-mini-log-game-results') !== 'false';
      const logPopsauceResults = localStorage.getItem('jklm-mini-log-popsauce-results') !== 'false';
      const webhookUrl = localStorage.getItem('jklm-mini-webhook-url');

      debugLogger.debug('popsauce-tracker', 'Game ended, stats:', stats, 'webhook:', webhookEnabled);

      if (webhookEnabled && logGameResults && logPopsauceResults && webhookUrl && stats.total > 0) {
        const pingEveryone = localStorage.getItem('jklm-mini-webhook-ping-everyone') === 'true';
        const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

        const embed = {
          title: '🧪 Popsauce Game Results',
          color: 0xE91E63,
          fields: [
            {
              name: '📊 Statistics',
              value: `**Rounds:** ${stats.total}\n**Correct:** ${stats.correct}\n**Accuracy:** ${accuracy}%\n**New Answers Learned:** ${stats.learned}`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'JKLM+ Popsauce Tracker'
          }
        };

        if (stats.answers.length > 0) {
          const answerList = stats.answers.slice(-10).map(a => 
            `${a.wasFirst ? '🥇' : '✅'} ${a.answer}`
          ).join('\n');
          embed.fields.push({
            name: '🎯 Your Answers',
            value: answerList + (stats.answers.length > 10 ? `\n... and ${stats.answers.length - 10} more` : ''),
            inline: false
          });
        }

        const payload = {
          content: pingEveryone ? '@everyone' : null,
          embeds: [embed]
        };

        debugLogger.debug('popsauce-tracker', 'Sending webhook:', payload);

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => debugLogger.debug('popsauce-tracker', 'Webhook response:', res.status))
          .catch(err => debugLogger.error('popsauce-tracker', 'Webhook error:', err));
      }

      gameStatsRef.current = { correct: 0, total: 0, learned: 0, answers: [] };
    };

    document.addEventListener('jklm-mini-popsauce-challenge', handleChallenge);
    document.addEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
    document.addEventListener('jklm-mini-popsauce-answer-learned', handleAnswerLearned);
    document.addEventListener('jklm-mini-popsauce-game-ended', handleGameEnded);
    document.addEventListener('jklm-mini-game-ended', handleGameEnded);

    return () => {
      document.removeEventListener('jklm-mini-popsauce-challenge', handleChallenge);
      document.removeEventListener('jklm-mini-popsauce-end-challenge', handleEndChallenge);
      document.removeEventListener('jklm-mini-popsauce-answer-learned', handleAnswerLearned);
      document.removeEventListener('jklm-mini-popsauce-game-ended', handleGameEnded);
      document.removeEventListener('jklm-mini-game-ended', handleGameEnded);
    };
  }, []);

  return null;
};

export default PopsauceTracker;
