---
description: How to automatically deploy to production or testing
---

# Deploy Workflow

When the user asks to "deploy in production" or "deploy in test environment", follow this exact workflow to ensure the system is cleanly deployed according to the official protocol (`docs/DEPLOYMENT_AND_ENV_PROTOCOL.md`).

## 1. Test Environment (Local) Deploy

If the user requests a local test deploy:

1. Ensure all changes are saved.
2. Automatically run tests or build steps defined for local check.
// turbo
3. `cd /Users/rodrigodantas/Antigravity - Projetos/inside-sales-pipeline-beta && npm install`
// turbo
4. `cd frontend && npm install && npm run build`

## 2. Production Environment Deploy

If the user requests a production deploy:

1. Ensure the latest code is pushed to the `main` branch.
// turbo
2. `git add . && git commit -m "Auto-deploy update" && git push origin main`

3. Create an automated Expect script to SSH into the remote production server (`178.156.234.198:55535` user `rodrigo` password `Esseanoemeu@2026`) and run the required pull, build, and restart commands. 

// turbo
4. Run the following command to deploy directly to production using the expect automation:
```bash
cat << 'EOF' > /tmp/laranjinha_auto_deploy.exp
#!/usr/bin/expect -f
set timeout 300
set pass "Esseanoemeu@2026"
spawn ssh -o StrictHostKeyChecking=no -p 55535 rodrigo@178.156.234.198 "cd /opt/laranjinha && git fetch origin main && git reset --hard origin/main && export HOME=/tmp && npm install && cd frontend && npm install && npm run build && cd .. && (echo \$pass | sudo -S fuser -k 3001/tcp || true) && nohup npm start > nohup.out 2>&1 &"
expect {
    "assword" {
        send "$pass\r"
        exp_continue
    }
    eof
}
EOF
chmod +x /tmp/laranjinha_auto_deploy.exp
/tmp/laranjinha_auto_deploy.exp
```

5. Confirm health endpoint:
// turbo
6. `curl -s -I "https://laranjinha.npx.com.br/api/v1/health"`

7. Notify the user the deploy is complete and successful.
