const User = require('../models/User');
const Group = require('../models/Group');
const sessionManager = require('../utils/sessionManager');
const whatsappService = require('./whatsappService');
const thriftService = require('./thriftService');
const logger = require('../utils/logger');

class MessageHandler {
  async processMessage(from, messageBody, messageData) {
    try {
      console.log("this is the messageBody: ", messageBody);
      const command = messageBody.toLowerCase().trim();
      
      // Get or create user session
      let user = await User.findOne({ whatsappId: from });
      
      if (!user && !command.startsWith('/start') && !command.startsWith('/register')) {
        await whatsappService.sendMessage(from, 
          "👋 Welcome to GATE Africa!\n\nTo get started, please register by typing:\n/register <your_name> <your_email>\n\nExample: /register John Doe john@email.com\n\nNeed help? Type /help to see available commands."
        );
        return;
      }

      // Update user activity
      if (user) {
        await user.updateActivity();
      }

      // Route commands
      if (command.startsWith('/start')) {
        await this.handleStart(from);
      } else if (command.startsWith('/register')) {
        await this.handleRegister(from, messageBody);
      } else if (command.startsWith('/help')) {
        await this.handleHelp(from);
      } else if (command.startsWith('/profile')) {
        await this.handleProfile(from);
      } else if (command.startsWith('/create_group')) {
        await this.handleCreateGroup(from, messageBody, user);
      } else if (command.startsWith('/join_group')) {
        await this.handleJoinGroup(from, messageBody, user);
      } else if (command.startsWith('/groups')) {
        await this.handleListGroups(from, user);
      } else if (command.startsWith('/group_details')) {
        await this.handleGroupDetails(from, messageBody, user);
      } else if (command.startsWith('/contribute')) {
        await this.handleContribute(from, messageBody, user);
      } else if (command.startsWith('/balance')) {
        await this.handleBalance(from, user);
      } else if (command.startsWith('/transactions')) {
        await this.handleTransactions(from, user);
      } else if (command.startsWith('/status')) {
        await this.handleStatus(from);
      } else if (command.startsWith('/developer')) {
        await this.handleDeveloper(from);
      }  else {
        await whatsappService.sendMessage(from, 
          "❓ Sorry, I didn't recognize that command.\n\nType /help to see a list of available commands."
        );
      }
    } catch (error) {
      logger.error('Message processing error:', error);
      await whatsappService.sendMessage(from, 
        "Sorry, an error occurred. Please try again later."
      );
    }
  }

  async handleStart(from) {
    const welcomeMessage = `
🌟 *Welcome to GATE Africa!* 🌟

I help you manage your savings groups (ajo/esusu) right here on WhatsApp!

*What I can do:*
✅ Track your contributions
💰 Handle automatic payouts
👥 Manage group rotations
📊 Keep transaction records

*To get started:*
Type: /register <your_name> <your_email>

Example: /register John Doe john@email.com

Type /help for all commands.
    `;
    
    await whatsappService.sendMessage(from, welcomeMessage);
  }

  async handleRegister(from, messageBody) {
    try {
      const parts = messageBody.split(' ');
      if (parts.length < 4) {
        await whatsappService.sendMessage(from, 
          "Please provide your name and email.\nFormat: /register <name> <email>\nExample: /register John Doe john@email.com"
        );
        return;
      }

      const name = parts.slice(1, -1).join(' ');
      const email = parts[parts.length - 1];

      // Basic email validation
      if (!email.includes('@')) {
        await whatsappService.sendMessage(from, "Please provide a valid email address.");
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ whatsappId: from }, { email: email }] 
      });

      if (existingUser) {
        await whatsappService.sendMessage(from, "You are already registered! Type /profile to see your details.");
        return;
      }

      // Create new user
      const user = new User({
        whatsappId: from,
        phoneNumber: from,
        name: name,
        email: email
      });

      await user.save();
      logger.info(`New user registered: ${name} (${from})`);

      await whatsappService.sendMessage(from, 
        `🎉 Registration successful!\n\n*Name:* ${name}\n*Email:* ${email}\n\nYou can now create or join thrift groups. Type /help for available commands.`
      );
    } catch (error) {
      logger.error('Registration error:', error);
      await whatsappService.sendMessage(from, "Registration failed. Please try again.");
    }
  }

  async handleHelp(from) {
    const helpMessage = `
      📋 *Available Commands:*

      *🔐 Account:*
      /register <name> <email> - Register your account
      /profile - View your profile
      /balance - Check your balance

      *👥 Groups:*
      /create_group <name> <amount> <max_members> - Create group
      /join_group <group_name> - Join a group
      /groups - List your groups
      /group_details <group_name> - View group details

      *💰 Contributions:*
      /contribute <group_name> <amount> - Make contribution
      /transactions - View transaction history

      *ℹ️ Information:*
      /help - Show this help message

      Need help? Contact support!
    `;
    
    await whatsappService.sendMessage(from, helpMessage);
  }

  async handleProfile(from) {
    try {
      const user = await User.findOne({ whatsappId: from }).populate('groups');
      
      if (!user) {
        await whatsappService.sendMessage(from, "Please register first using /register");
        return;
      }

      const profileMessage = `
        👤 *Your Profile:*

        *Name:* ${user.name}
        *Email:* ${user.email}
        *Phone:* ${user.phoneNumber}
        *Balance:* ₦${user.balance.toLocaleString()}
        *Groups:* ${user.groups.length}
        *Registered:* ${user.registeredAt.toDateString()}

        ${user.bankDetails.accountNumber ? 
          `*Bank Details:*\nAccount: ${user.bankDetails.accountNumber}\nBank: ${user.bankDetails.bankName}\nName: ${user.bankDetails.accountName}` : 
          'No bank details added yet.'
        }
      `;
      
      await whatsappService.sendMessage(from, profileMessage);
    } catch (error) {
      logger.error('Profile error:', error);
      await whatsappService.sendMessage(from, "Error retrieving profile.");
    }
  }

  async handleCreateGroup(from, messageBody, user) {
    try {
      const parts = messageBody.split(' ');
      if (parts.length < 4) {
        await whatsappService.sendMessage(from, 
          "Format: /create_group <name> <amount> <max_members>\nExample: /create_group MyGroup 5000 10"
        );
        return;
      }

      const name = parts[1];
      const amount = parseInt(parts[2]);
      const maxMembers = parseInt(parts[3]);

      if (isNaN(amount) || isNaN(maxMembers) || amount <= 0 || maxMembers <= 0) {
        await whatsappService.sendMessage(from, "Please provide valid numbers for amount and max members.");
        return;
      }

      const group = new Group({
        name: name,
        contributionAmount: amount,
        maxMembers: maxMembers,
        creator: user._id,
        members: [{ user: user._id }],
        startDate: new Date()
      });

      await group.save();
      
      // Add group to user's groups
      user.groups.push(group._id);
      await user.save();

      logger.info(`New group created: ${name} by ${user.name}`);

      await whatsappService.sendMessage(from, 
        `🎉 Group created successfully!\n\n*Name:* ${name}\n*Contribution:* ₦${amount.toLocaleString()}\n*Max Members:* ${maxMembers}\n*Group ID:* ${group._id}\n\nShare this Group ID with others to join!`
      );
    } catch (error) {
      logger.error('Create group error:', error);
      await whatsappService.sendMessage(from, "Error creating group. Please try again.");
    }
  }

  async handleJoinGroup(from, messageBody, user) {
    try {
      const parts = messageBody.split(' ');
      if (parts.length !== 2) {
        await whatsappService.sendMessage(from, 
          "Format: /join_group <group_name>\nExample: /join_group group1"
        );
        return;
      }

      const groupName = parts[1];
      const group = await Group.findOne({ name: groupName });

      if (!group) {
        await whatsappService.sendMessage(from, "Group not found. Please check the Group Name.");
        return;
      }

      if (!group.isActive) {
        await whatsappService.sendMessage(from, "This group is no longer active.");
        return;
      }

      await group.addMember(user._id);
      
      // Add group to user's groups
      user.groups.push(group._id);
      await user.save();

      await whatsappService.sendMessage(from, 
        `✅ Successfully joined "${group.name}"!\n\n*Contribution Amount:* ₦${group.contributionAmount.toLocaleString()}\n*Members:* ${group.members.length}/${group.maxMembers}\n\nYou can now make contributions to this group.`
      );
    } catch (error) {
      if (error.message.includes('full') || error.message.includes('already a member')) {
        await whatsappService.sendMessage(from, error.message);
      } else {
        logger.error('Join group error:', error);
        await whatsappService.sendMessage(from, "Error joining group. Please try again.");
      }
    }
  }

  async handleListGroups(from, user) {
    try {
      const userWithGroups = await User.findById(user._id).populate('groups');
      
      if (userWithGroups.groups.length === 0) {
        await whatsappService.sendMessage(from, 
          "You haven't joined any groups yet. Create one with /create_group or join with /join_group"
        );
        return;
      }

      let groupsMessage = "👥 *Your Groups:*\n\n";
      
      userWithGroups.groups.forEach((group, index) => {
        groupsMessage += `${index + 1}. *${group.name}*\n`;
        groupsMessage += `   🆔 Group ID: ${group._id}\n`;
        groupsMessage += `   💰 ₦${group.contributionAmount.toLocaleString()} per contribution\n`;
        groupsMessage += `   👤 ${group.members.length}/${group.maxMembers} members\n`;
        groupsMessage += `   🔄 Cycle ${group.currentCycle}\n`;
        groupsMessage += `   📅 Started: ${group.startDate.toDateString()}\n\n`;
      });

      await whatsappService.sendMessage(from, groupsMessage);
    } catch (error) {
      logger.error('List groups error:', error);
      await whatsappService.sendMessage(from, "Error retrieving groups.");
    }
  }

  async handleGroupDetails(from, messageBody, user) {
    try {
      const parts = messageBody.split(' ');
      if (parts.length !== 2) {
        await whatsappService.sendMessage(from, 
          "Format: /group_details <group_name>\nExample: /group_details group1"
        );
        return;
      }

      const groupName = parts[1];
      const group = await Group.findOne({ name: groupName });

      if (!group) {
        await whatsappService.sendMessage(from, "Group not found. Please check the Group ID.");
        return;
      } 
      const detailsMessage = `
        🔍 *Group Details:*

        *Name:* ${group.name}
        *Contribution Amount:* ₦${group.contributionAmount.toLocaleString()}
        *Max Members:* ${group.maxMembers}
        *Members:* ${group.members.length}/${group.maxMembers}
        *Cycle:* ${group.currentCycle}
        *Started:* ${group.startDate.toDateString()}

        ${group.members.map(member => `👤 ${member.user.name} (${member.user.phoneNumber})`).join('\n')}
      `;

      await whatsappService.sendMessage(from, detailsMessage);
    } catch (error) {
      logger.error('Group details error:', error);
      await whatsappService.sendMessage(from, "Error retrieving group details.");
    }
  }

  async handleContribute(from, messageBody, user) {
    try {
      const parts = messageBody.split(' ');
      if (parts.length !== 3) {
        await whatsappService.sendMessage(from, 
          "Format: /contribute <group_name> <amount>\nExample: /contribute group1 5000"
        );
        return;
      }

      const groupName = parts[1];
      const amount = parseInt(parts[2]);
      const group = await Group.findOne({ name: groupName });

      if (isNaN(amount) || amount <= 0) {
        await whatsappService.sendMessage(from, "Please provide a valid amount.");
        return;
      }

      const result = await thriftService.initiateContribution(user._id, group._id, amount);
      
      if (result.success) {
        await whatsappService.sendMessage(from, result.message);
      } else {
        await whatsappService.sendMessage(from, `Error: ${result.error}`);
      }
    } catch (error) {
      logger.error('Contribute error:', error);
      await whatsappService.sendMessage(from, "Error processing contribution. Please try again.");
    }
  }

  async handleBalance(from, user) {
    try {
      await whatsappService.sendMessage(from, 
        `💰 *Your Balance:* ₦${user.balance.toLocaleString()}`
      );
    } catch (error) {
      logger.error('Balance error:', error);
      await whatsappService.sendMessage(from, "Error retrieving balance.");
    }
  }

  async handleTransactions(from, user) {
    try {
      const Transaction = require('../models/Transaction');
      const transactions = await Transaction.find({ user: user._id })
        .populate('group', 'name')
        .sort({ createdAt: -1 })
        .limit(10);

      if (transactions.length === 0) {
        await whatsappService.sendMessage(from, "No transactions found.");
        return;
      }

      let transactionMessage = "📊 *Recent Transactions:*\n\n";
      
      transactions.forEach((txn, index) => {
        const date = txn.createdAt.toLocaleDateString();
        const amount = txn.amount.toLocaleString();
        const status = txn.status.toUpperCase();
        const group = txn.group ? txn.group.name : 'N/A';
        
        transactionMessage += `${index + 1}. ${txn.type.toUpperCase()}\n`;
        transactionMessage += `   💰 ₦${amount}\n`;
        transactionMessage += `   📅 ${date}\n`;
        transactionMessage += `   👥 ${group}\n`;
        transactionMessage += `   ✅ ${status}\n\n`;
      });

      await whatsappService.sendMessage(from, transactionMessage);
    } catch (error) {
      logger.error('Transactions error:', error);
      await whatsappService.sendMessage(from, "Error retrieving transactions.");
    }
  }

  async handleStatus(from) {
    const statusMessage = `
      🤖 *Bot Status:* Online ✅
      🕐 *Server Time:* ${new Date().toLocaleString()}
      💚 *All systems operational*

      For support, contact our team.
    `;
    
    await whatsappService.sendMessage(from, statusMessage);
  }

  async handleDeveloper(from) {
    const developerInfo = `
      👨‍💻 *Developer Information*

      *Name:* Peter Thomas (Techta)
      *WhatsApp:* +2349066730090
      *LinkedIn:* https://linkedin.com/in/peterthomas-dev
    `;
    await whatsappService.sendMessage(from, developerInfo);
  }
}

module.exports = new MessageHandler();