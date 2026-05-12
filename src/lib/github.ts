const GITHUB_API = 'https://api.github.com';

export async function createGitHubIssue(
    title: string,
    body: string,
    labels: string[] = []
) {
    const res = await fetch(
        `${GITHUB_API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                body,
                labels,
            }),
        }
    );

    const data = await res.json();

    if (!res.ok) {
        console.error('❌ GitHub Issue Error:', data);
        throw new Error(data.message || 'Error creando issue');
    }

    return data;
}

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: Array<{ name: string }>;
}

export async function searchGitHubIssues(label: string, titleQuery: string): Promise<GitHubIssue[]> {
  const q = encodeURIComponent(`is:issue label:${label} ${titleQuery}`);
  const url = `${GITHUB_API}/search/issues?q=${q}+repo:${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    console.error('❌ GitHub Search Error:', res.status);
    return [];
  }

  const data = await res.json();
  return (data.items || []) as GitHubIssue[];
}

export async function listOpenIssuesByLabel(labels: string[]): Promise<GitHubIssue[]> {
  const labelFilter = labels.map(l => encodeURIComponent(l)).join(',');
  const url = `${GITHUB_API}/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues?labels=${labelFilter}&state=open&per_page=100`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    console.error('❌ GitHub List Error:', res.status);
    return [];
  }

  return (await res.json()) as GitHubIssue[];
}