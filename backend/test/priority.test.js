const Issue = require('../src/models/Issue');

describe('issue priority escalation', () => {
  test('escalates at five and ten upvotes', () => {
    const issue = { priority: 'medium', priorityManuallySet: false, upvotes: [1, 2, 3, 4, 5] };

    Issue.escalateFromUpvotes(issue);
    expect(issue.priority).toBe('high');

    issue.upvotes.push(6, 7, 8, 9, 10);
    Issue.escalateFromUpvotes(issue);
    expect(issue.priority).toBe('urgent');
  });

  test('does not override a manually selected priority', () => {
    const issue = { priority: 'low', priorityManuallySet: true, upvotes: [1, 2, 3, 4, 5, 6] };

    Issue.escalateFromUpvotes(issue);
    expect(issue.priority).toBe('low');
  });
});
