## Installation Steps

### 1. Create a Personal Access Token (PAT) on GitHub

- Go to your GitHub settings.
- Click on "Developer settings" in the sidebar.
- Select "Personal access tokens" and then "Generate new token".
- Give your token a name, select the expiration period, and set the scopes. For npm packages, you usually need `read:packages` to download packages and `write:packages` to publish them.
- Click "Generate token" at the bottom. Remember to copy your new personal access token; you won’t be able to see it again!

### 2. Add PAT Token to `~/.bashrc` or `~/.profile`

- Open `~/.bashrc` or `~/.profile` in a text editor.
- Add the following line:
  ```bash
  export PAT_TOKEN="your_personal_access_token_here"
  ```
- Save the file and run `source ~/.bashrc` or `source ~/.profile` to apply the changes.

### 3. Create `.npmrc` File

- In the root of your project (where `package.json` is located), create a file named `.npmrc`.

### 4. Add Content to `.npmrc`

- Open the `.npmrc` file in a text editor.
- Add the following content:
  ```
  @thisisarchimedes:registry=https://npm.pkg.github.com/
  //npm.pkg.github.com/:_authToken=${PAT_TOKEN}
  ```

### 5. Add Package to `package.json`

- In your `package.json`, add the dependency:

  ```json
  "@thisisarchimedes/leverage-sdk": "latest"
  ```

  After completing these steps, run `npm install` to install your dependencies. The configuration in your `.npmrc` will authenticate with GitHub Packages to fetch the `@thisisarchimedes/leverage-sdk` package.

### 6. Install project packages

```
npm install
```

## Viewing the Package on GitHub

You can view the package and its versions on the package screen in our GitHub organization. This allows you to easily track and manage different versions of the package.

https://github.com/orgs/thisisarchimedes/packages
