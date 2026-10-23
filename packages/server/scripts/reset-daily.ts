async function reset() {
  const res = await fetch('http://localhost:3001/api/bonuses/reset-daily', {
    method: 'POST',
    headers: { 'x-telegram-init-data': 'dev' }
  });
  console.log('Reset response:', await res.json());
}
reset();
