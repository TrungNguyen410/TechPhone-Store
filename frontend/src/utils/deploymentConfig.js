const deploymentTargets = new Set(['local', 'docker', 'render']);

export const normalizeDeploymentTarget = (env = {}, production = Boolean(env.PROD)) => {
  const target = String(
    env.VITE_DEPLOYMENT_TARGET || (production ? 'render' : 'local'),
  ).trim().toLowerCase();

  if (!deploymentTargets.has(target)) {
    throw new Error(
      `VITE_DEPLOYMENT_TARGET "${target}" is not supported; use render, docker, or local`,
    );
  }
  if (production && target === 'local') {
    throw new Error('VITE_DEPLOYMENT_TARGET "local" is not valid in production; use docker for local containers');
  }

  return target;
};

const isLoopbackHostname = (hostname) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized === '::1'
    || /^127\./.test(normalized);
};

export const normalizePublicUrl = (
  name,
  value,
  {
    fallback = '',
    originOnly = false,
    production = false,
    deploymentTarget = production ? 'render' : 'local',
  } = {},
) => {
  const resolved = String(value || fallback).trim();
  if (!resolved) return '';

  let parsed;
  try {
    parsed = new URL(resolved);
  } catch {
    if (!production) return resolved.replace(/\/+$/, '');
    throw new Error(`${name} must be an absolute HTTP(S) URL in production`);
  }

  if (production && !['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must be an absolute HTTP(S) URL in production`);
  }
  if (production && (parsed.username || parsed.password || parsed.search || parsed.hash)) {
    throw new Error(`${name} must not contain credentials, query, or fragment in production`);
  }
  if (production && originOnly && !/^\/+$/u.test(parsed.pathname)) {
    throw new Error(`${name} must be an HTTP(S) origin without a path in production`);
  }
  if (production && deploymentTarget === 'render' && isLoopbackHostname(parsed.hostname)) {
    throw new Error(`${name} must not use a loopback host for Render production`);
  }

  return originOnly ? parsed.origin : parsed.href.replace(/\/+$/, '');
};
