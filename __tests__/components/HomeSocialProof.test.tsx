/**
 * The signed-out homepage's claims. The two this block replaced, "2,000+ active
 * learners" and "4.9/5 average rating", had no source. These cases hold the
 * replacements to the rule that got the old pair removed: a figure appears only
 * when it was counted, and an absent count costs the line rather than the truth.
 */
import { render, screen } from '@testing-library/react';
import HomeSocialProofRow from '../../components/home/HomeSocialProof';

describe('what the page claims to a stranger', () => {
  it('states the set count it was given', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: null }} />);

    expect(screen.getByText('134 ready-to-study sets')).toBeInTheDocument();
  });

  it('says what the fact-check test actually checks', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 4 }} />);

    expect(screen.getByText('Checked, not just generated.')).toBeInTheDocument();
    expect(
      screen.getByText(/Every math fact is verified against the arithmetic by an automated test/),
    ).toBeInTheDocument();
  });

  it('names the window the learner count covers', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 4 }} />);

    expect(screen.getByText('4 learners studied in the last 30 days')).toBeInTheDocument();
  });

  it('reads correctly for a single learner', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 1 }} />);

    expect(screen.getByText('1 learner studied in the last 30 days')).toBeInTheDocument();
  });

  it('shows a small count as it is rather than rounding it up to a nicer one', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 3 }} />);

    expect(screen.getByText('3 learners studied in the last 30 days')).toBeInTheDocument();
    expect(screen.queryByText(/2,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it('drops the learner line when the count failed', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: null }} />);

    expect(screen.queryByText(/studied in the last/)).not.toBeInTheDocument();
  });

  it('drops the learner line rather than announcing nobody', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 0 }} />);

    expect(screen.queryByText(/studied in the last/)).not.toBeInTheDocument();
  });

  it('drops the set line when the content did not load', () => {
    render(<HomeSocialProofRow proof={{ setCount: null, activeLearners: 4 }} />);

    expect(screen.queryByText(/ready-to-study sets/)).not.toBeInTheDocument();
    // The fact-check claim needs no runtime data, so it survives on its own.
    expect(screen.getByText('Checked, not just generated.')).toBeInTheDocument();
  });

  it('still renders with nothing counted at all', () => {
    render(<HomeSocialProofRow proof={null} />);

    expect(screen.getByText('Checked, not just generated.')).toBeInTheDocument();
    expect(screen.queryByText(/ready-to-study sets/)).not.toBeInTheDocument();
    expect(screen.queryByText(/studied in the last/)).not.toBeInTheDocument();
  });

  it('keeps neither of the two claims that had no source', () => {
    render(<HomeSocialProofRow proof={{ setCount: 134, activeLearners: 4 }} />);

    expect(screen.queryByText(/2,000\+ active learners/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.9\/5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/average rating/)).not.toBeInTheDocument();
  });
});
