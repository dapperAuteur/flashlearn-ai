import { BRAND } from './styles';

interface VersusTemplateProps {
  topic: string;
  code: string;
  participantCount: number;
  maxParticipants: number;
  cardCount: number;
}

export function VersusTemplate({
  topic,
  code,
  participantCount,
  maxParticipants,
  cardCount,
}: VersusTemplateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, #1e3a5f 0%, #111827 60%, #7c1d1d 100%)`,
        padding: '60px',
        fontFamily: 'sans-serif',
        color: BRAND.white,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            borderRadius: '12px',
            padding: '8px 20px',
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '4px',
            color: BRAND.white,
          }}
        >
          VS
        </div>
        <span style={{ fontSize: '24px', fontWeight: 600, color: '#93c5fd', letterSpacing: '1px' }}>
          FlashLearn AI · Challenge
        </span>
      </div>

      {/* Topic */}
      <div
        style={{
          fontSize: topic.length > 40 ? '42px' : '52px',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '24px',
          color: BRAND.white,
          maxWidth: '900px',
        }}
      >
        {topic}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '32px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '4px' }}>Cards</span>
          <span style={{ fontSize: '32px', fontWeight: 700 }}>{cardCount}</span>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '4px' }}>Players</span>
          <span style={{ fontSize: '32px', fontWeight: 700 }}>
            {participantCount}/{maxParticipants}
          </span>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '4px' }}>Code</span>
          <span style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '4px' }}>{code}</span>
        </div>
      </div>
    </div>
  );
}

interface ResultsTemplateProps {
  setName: string;
  accuracy: number;
  correct: number;
  total: number;
  durationLabel: string;
}

export function ResultsTemplate({
  setName,
  accuracy,
  correct,
  total,
  durationLabel,
}: ResultsTemplateProps) {
  const accuracyColor = accuracy >= 80 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)`,
        padding: '60px',
        fontFamily: 'sans-serif',
        color: BRAND.gray[900],
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <span style={{ fontSize: '20px', fontWeight: 600, color: BRAND.primaryBlue }}>
          FlashLearn AI · Study Results
        </span>
      </div>

      {/* Set name */}
      <div
        style={{
          fontSize: setName.length > 40 ? '34px' : '42px',
          fontWeight: 700,
          color: BRAND.gray[700],
          marginBottom: '40px',
          maxWidth: '800px',
          lineHeight: 1.2,
        }}
      >
        {setName}
      </div>

      {/* Big accuracy */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '120px', fontWeight: 800, color: accuracyColor, lineHeight: 1 }}>
          {accuracy}%
        </span>
        <span style={{ fontSize: '28px', color: BRAND.gray[500], fontWeight: 500 }}>accuracy</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '40px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', color: BRAND.gray[500], marginBottom: '4px' }}>Correct</span>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a' }}>
            {correct} / {total}
          </span>
        </div>
        <div style={{ width: '1px', background: BRAND.gray[200] }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '14px', color: BRAND.gray[500], marginBottom: '4px' }}>Duration</span>
          <span style={{ fontSize: '28px', fontWeight: 700, color: BRAND.gray[700] }}>
            {durationLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SetTemplateProps {
  title: string;
  description: string;
  cardCount: number;
}

export function SetTemplate({ title, description, cardCount }: SetTemplateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)`,
        padding: '60px',
        fontFamily: 'sans-serif',
        color: BRAND.gray[900],
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        <span style={{ fontSize: '20px', fontWeight: 600, color: BRAND.primaryBlue }}>
          FlashLearn AI · Flashcard Set
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: title.length > 50 ? '40px' : '52px',
          fontWeight: 800,
          lineHeight: 1.15,
          color: BRAND.gray[900],
          marginBottom: '20px',
          maxWidth: '900px',
        }}
      >
        {title}
      </div>

      {/* Description */}
      {description && (
        <div
          style={{
            fontSize: '24px',
            color: BRAND.gray[500],
            lineHeight: 1.4,
            marginBottom: '40px',
            maxWidth: '860px',
            overflow: 'hidden',
            display: '-webkit-box',
          }}
        >
          {description.length > 120 ? `${description.slice(0, 120)}…` : description}
        </div>
      )}

      {/* Card count badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
        <div
          style={{
            background: BRAND.primaryBlue,
            color: BRAND.white,
            borderRadius: '9999px',
            padding: '8px 24px',
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {cardCount} cards
        </div>
        <span style={{ fontSize: '20px', color: BRAND.gray[400] }}>→ Study this set free</span>
      </div>
    </div>
  );
}
