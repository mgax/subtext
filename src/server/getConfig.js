export default function(env, name, message) {
  let value = env[name]
  if(value) return value
  console.error(`Missing environment variable ${name}: ${message}`)
  process.exit(1)
}
