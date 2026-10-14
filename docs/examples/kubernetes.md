---
title: Example 6 – Kubernetes Ingress & CRDs
---

<script setup>
import { computed } from 'vue'
import { buildSnippet } from '../.vitepress/theme/composables/useCodeSnippet'

// ─── 1. Static Cluster Helm Configuration ─────────────────────────────────────
const helmStatic = buildSnippet({
  lang: 'yaml',
  code: `# values.yaml (Traefik Helm Chart)
additionalArguments:
  - "--experimental.plugins.routewarden.modulename=github.com/routewarden/traefik-warden"
  - "--experimental.plugins.routewarden.version={{traefik_version}}"`,
})

const helmSnippets = computed(() => ({
  traefik: [{ filename: 'values.yaml', lang: 'yaml', code: helmStatic.cleanCode, html: helmStatic.html, hasDiff: false }],
}))

// ─── 2. Kubernetes Ingress & CRD Manifests ────────────────────────────────────
const traefikMiddleware = buildSnippet({
  lang: 'yaml',
  code: `# middleware.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: routewarden-k8s-shield
  namespace: default
spec:
  plugin:
    routewarden:
      enabled: true
      enableDefaultPatterns: true
      checkQuery: true
      allowedIps:
        - "10.0.0.0/8"
        - "172.16.0.0/12"
      response:
        mode: json
        statusCode: 403
        body: '{"error":"Forbidden","source":"k8s-routewarden-crd"}'`,
})

const traefikIngressRoute = buildSnippet({
  lang: 'yaml',
  code: `# ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: secured-app-ingress
  namespace: default
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(\`production.example.com\`)
      kind: Rule
      services:
        - name: app-service
          port: 80
      middlewares:
        - name: routewarden-k8s-shield`,
})

const caddyConfigMap = buildSnippet({
  lang: 'yaml',
  code: `# caddy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: caddy-config
  namespace: default
data:
  Caddyfile: |
    {
        order routewarden before reverse_proxy
    }

    production.example.com {
        routewarden {
            enable_default_patterns true
            check_query true
            allowed_ips "10.0.0.0/8" "172.16.0.0/12"
            response {
                mode json
                status_code 403
                body "{\\"error\\":\\"Forbidden\\",\\"source\\":\\"caddy-k8s\\"}"
            }
        }

        reverse_proxy app-service.default.svc.cluster.local:80
    }`,
})

const caddyIngress = buildSnippet({
  lang: 'yaml',
  code: `# caddy-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production-ingress
  namespace: default
  annotations:
    caddy.community/order: "routewarden before reverse_proxy"
spec:
  ingressClassName: caddy
  rules:
    - host: production.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80`,
})

const nginxIngressSnippet = buildSnippet({
  lang: 'yaml',
  code: `# nginx-ingress-snippet.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secured-nginx-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/server-snippet: |
      lua_package_path "/etc/nginx/lua/lib/?.lua;/etc/nginx/lua/lib/?/init.lua;;";
      init_by_lua_block {
        local routewarden = require("resty.routewarden")
        warden = routewarden.new({
          enable_default_patterns = true,
          check_query = true,
          allowed_ips = { "10.0.0.0/8", "172.16.0.0/12" },
          response = {
            mode = "json",
            status_code = 403,
            body = '{"error":"Forbidden","source":"k8s-nginx-ingress"}'
          }
        })
      }
    nginx.ingress.kubernetes.io/configuration-snippet: |
      access_by_lua_block {
        warden:check()
      }
spec:
  ingressClassName: nginx
  rules:
    - host: production.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 80`,
})

const k8sManifestSnippets = computed(() => ({
  traefik: [
    { filename: 'middleware.yaml', lang: 'yaml', code: traefikMiddleware.cleanCode, html: traefikMiddleware.html, hasDiff: false },
    { filename: 'ingressroute.yaml', lang: 'yaml', code: traefikIngressRoute.cleanCode, html: traefikIngressRoute.html, hasDiff: false },
  ],
  caddy: [
    { filename: 'caddy-configmap.yaml', lang: 'yaml', code: caddyConfigMap.cleanCode, html: caddyConfigMap.html, hasDiff: false },
    { filename: 'caddy-ingress.yaml', lang: 'yaml', code: caddyIngress.cleanCode, html: caddyIngress.html, hasDiff: false },
  ],
  nginx: [
    { filename: 'nginx-ingress.yaml', lang: 'yaml', code: nginxIngressSnippet.cleanCode, html: nginxIngressSnippet.html, hasDiff: false },
  ],
}))

// ─── 3. Deployment & Inspection Commands ──────────────────────────────────────
const deployTraefik = buildSnippet({
  lang: 'bash',
  code: `# Apply Traefik CRDs
kubectl apply -f middleware.yaml
kubectl apply -f ingressroute.yaml

# Inspect middleware status
kubectl get middleware routewarden-k8s-shield -o yaml`,
})

const deployCaddy = buildSnippet({
  lang: 'bash',
  code: `# Apply Caddy ConfigMap and Ingress
kubectl apply -f caddy-configmap.yaml
kubectl apply -f caddy-ingress.yaml

# Restart Caddy deployment to reload ConfigMap
kubectl rollout restart deployment/caddy-ingress-controller`,
})

const deployNginx = buildSnippet({
  lang: 'bash',
  code: `# Apply Ingress-NGINX manifest
kubectl apply -f nginx-ingress-snippet.yaml

# Verify Ingress resource
kubectl get ingress secured-nginx-ingress`,
})

const deployCommandsSnippets = computed(() => ({
  traefik: [{ filename: 'Traefik Commands', lang: 'bash', code: deployTraefik.cleanCode, html: deployTraefik.html, hasDiff: false }],
  caddy:   [{ filename: 'Caddy Commands',   lang: 'bash', code: deployCaddy.cleanCode,   html: deployCaddy.html,   hasDiff: false }],
  nginx:   [{ filename: 'NGINX Commands',   lang: 'bash', code: deployNginx.cleanCode,   html: deployNginx.html,   hasDiff: false }],
}))
</script>

# Example 6: Kubernetes Ingress & CRDs

Deploy RouteWarden inside Kubernetes clusters using Custom Resource Definitions (`Middleware`, `IngressRoute`) or native Kubernetes `Ingress` annotations and `ConfigMap` resources.

---

## 1. Static Cluster Helm Configuration

When using Traefik, ensure the RouteWarden plugin is enabled in Traefik's Helm chart values:

<CodeViewer :snippets="helmSnippets" />

---

## 2. Ingress & Middleware Manifests

Select your ingress controller below to view the corresponding Kubernetes manifests:

<CodeViewer :snippets="k8sManifestSnippets" />

---

## 3. Deployment Commands

Apply the manifests and verify your ingress shield status:

<CodeViewer :snippets="deployCommandsSnippets" />
