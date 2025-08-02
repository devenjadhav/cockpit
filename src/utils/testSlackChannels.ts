import { WebClient } from '@slack/web-api';

export async function listSlackChannels(): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.log('❌ SLACK_BOT_TOKEN not configured');
    return;
  }

  const client = new WebClient(token);

  try {
    console.log('🔍 Testing Slack connection...');
    
    // Test auth
    const authTest = await client.auth.test();
    console.log('✅ Slack auth successful');
    console.log(`   Team: ${authTest.team}`);
    console.log(`   User: ${authTest.user}`);
    console.log(`   User ID: ${authTest.user_id}`);

    // List all channels
    console.log('\n📋 Available channels:');
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 200
    });

    if (!result.channels) {
      console.log('❌ No channels found');
      return;
    }

    console.log(`Found ${result.channels.length} channels:`);
    result.channels
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .forEach(channel => {
        const type = channel.is_private ? '🔒' : '📢';
        console.log(`   ${type} #${channel.name} (${channel.id})`);
      });

    // Look specifically for our target channels
    const targetChannels = ['daydream', 'daydream-bulletin'];
    console.log('\n🎯 Looking for target channels:');
    
    targetChannels.forEach(targetName => {
      const found = result.channels?.find(channel => channel.name === targetName);
      if (found) {
        console.log(`   ✅ #${targetName} found (${found.id})`);
      } else {
        console.log(`   ❌ #${targetName} NOT found`);
        
        // Look for similar names
        const similar = result.channels?.filter(channel => 
          channel.name?.includes(targetName) || targetName.includes(channel.name || '')
        );
        if (similar && similar.length > 0) {
          console.log(`      Similar channels found:`);
          similar.forEach(channel => {
            console.log(`        - #${channel.name} (${channel.id})`);
          });
        }
      }
    });

  } catch (error) {
    console.error('❌ Slack API error:', error);
  }
}
