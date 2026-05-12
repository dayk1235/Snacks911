import dotenv from 'dotenv';

// 👇 esto es la clave
dotenv.config({ path: '.env.local' });

import { createGitHubIssue } from '@/lib/github';

async function test() {
    //console.log('TOKEN:', process.env.GITHUB_TOKEN);

    const issue = await createGitHubIssue(
        'test: conexión GitHub',
        'probando desde script',
        ['feature']
    );

    console.log(issue.html_url);
}

test();