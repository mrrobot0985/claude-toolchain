# NPM Authentication Setup

The `release.yml` workflow publishes the `claude-toolchain` package to npm using `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`. Before any release can publish, a repository secret named `NPM_TOKEN` must be configured.

## 1. Generate an npm automation token

1. Go to <https://www.npmjs.com/settings/mrrobot0985/tokens> (or **npm profile** → **Access Tokens**).
2. Click **Generate New Token** → **Automation**.
3. Name: `github-actions-claude-toolchain`.
4. Copy the token value (starts with `npm_`).

## 2. Store it as a GitHub repository secret

1. Go to <https://github.com/mrrobot0985/claude-toolchain/settings/secrets/actions>.
2. Click **New repository secret**.
3. Name: `NPM_TOKEN`.
4. Value: the npm automation token from step 1.
5. Click **Add secret**.

## 3. Verify

- Confirm `NPM_TOKEN` appears in the repository secrets list.
- The release workflow will reference it as `${{ secrets.NPM_TOKEN }}`.

## 4. 2FA note

If the npm account has 2FA enabled, an automation token bypasses 2FA for publishes. This is the correct token type for CI/CD.
