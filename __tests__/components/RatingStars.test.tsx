/**
 * A star rating is a form control, not decoration. These assertions are the
 * accessibility contract: every star is a labelled radio a keyboard can reach,
 * and the value is always available as text rather than only as a row of icons.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import RatingStars from '@/components/RatingStars';

describe('read-only display', () => {
  it('states the average and rater count in text', () => {
    render(<RatingStars average={4.2} count={18} />);
    expect(screen.getByText('4.2 average from 18 ratings')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('says so plainly when nobody has rated yet', () => {
    render(<RatingStars average={0} count={0} />);
    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });
});

describe('interactive control', () => {
  it('gives every star its own accessible name', () => {
    render(<RatingStars setId="abc" average={0} count={0} interactive />);

    expect(screen.getByRole('group', { name: 'Rate this set' })).toBeInTheDocument();
    for (const star of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('radio', { name: `Rate ${star} out of 5` })).toBeInTheDocument();
    }
  });

  it('leaves the stars in the tab order as native radios', () => {
    render(<RatingStars setId="abc" average={0} count={0} interactive />);

    // Native radios in a named group are arrow-key operable by the browser. What
    // a component can get wrong is hiding them from the tab order, so that is
    // what this checks: visible to assistive tech, focusable, one shared name.
    const stars = screen.getAllByRole('radio');
    const names = new Set(stars.map((star) => star.getAttribute('name')));

    expect(stars).toHaveLength(5);
    expect(names.size).toBe(1);
    for (const star of stars) {
      expect(star.tagName).toBe('INPUT');
      expect(star).not.toBeDisabled();
      expect(star).not.toHaveAttribute('tabindex', '-1');
    }
  });

  it('sends the picked value to the rating endpoint', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ rating: 4, ratingAverage: 4, ratingCount: 1 }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<RatingStars setId="abc" average={0} count={0} interactive />);
    fireEvent.click(screen.getByRole('radio', { name: 'Rate 4 out of 5' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sets/abc/rating',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ rating: 4 }) }),
    );

    // The response carries the fresh aggregate, so the summary updates without
    // a second request.
    expect(
      await screen.findByText('You rated this 4 out of 5. 4.0 average from 1 rating.'),
    ).toBeInTheDocument();
  });

  it('reports the caller their own rating in words once they have one', () => {
    render(<RatingStars setId="abc" average={4} count={2} userRating={3} interactive />);
    expect(screen.getByText('You rated this 3 out of 5. 4.0 average from 2 ratings.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear my rating' })).toBeInTheDocument();
  });
});
