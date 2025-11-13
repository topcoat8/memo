import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Memo } from "../target/types/memo";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("memo", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Memo as Program<Memo>;

  // Generate test keypairs
  const sender = Keypair.generate();
  const recipient = Keypair.generate();

  // Helper function to airdrop SOL
  async function airdrop(pubkey: PublicKey, amount: number) {
    const signature = await provider.connection.requestAirdrop(
      pubkey,
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
  }

  before(async () => {
    // Airdrop SOL to test accounts
    await airdrop(sender.publicKey, 2);
    await airdrop(recipient.publicKey, 2);
  });

  it("Sends a memo successfully", async () => {
    // Create test message data
    const messageText = "Hello, this is a test message!";
    const encryptedData = new Uint8Array(100); // Mock encrypted data
    const nonce = new Array(24).fill(0); // Mock nonce

    // Derive PDAs
    const [counterPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        Buffer.from("counter"),
        sender.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [messagePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        sender.publicKey.toBuffer(),
        recipient.publicKey.toBuffer(),
        Buffer.alloc(8), // Counter = 0
      ],
      program.programId
    );

    const [senderIndexPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        Buffer.from("index"),
        sender.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [recipientIndexPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        Buffer.from("index"),
        recipient.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Send memo
    const tx = await program.methods
      .sendMemo(Array.from(encryptedData), nonce)
      .accounts({
        sender: sender.publicKey,
        recipient: recipient.publicKey,
        messageAccount: messagePDA,
        counterAccount: counterPDA,
        senderIndex: senderIndexPDA,
        recipientIndex: recipientIndexPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    console.log("Transaction signature:", tx);

    // Fetch and verify message account
    const messageAccount = await program.account.messageAccount.fetch(messagePDA);
    expect(messageAccount.sender.toString()).to.equal(sender.publicKey.toString());
    expect(messageAccount.recipient.toString()).to.equal(recipient.publicKey.toString());
    expect(messageAccount.deleted).to.be.false;
  });

  it("Prevents sending to self", async () => {
    const encryptedData = new Uint8Array(100);
    const nonce = new Array(24).fill(0);

    try {
      // This should fail
      await program.methods
        .sendMemo(Array.from(encryptedData), nonce)
        .accounts({
          sender: sender.publicKey,
          recipient: sender.publicKey, // Same as sender
          messageAccount: Keypair.generate().publicKey,
          counterAccount: Keypair.generate().publicKey,
          senderIndex: Keypair.generate().publicKey,
          recipientIndex: Keypair.generate().publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.message).to.include("InvalidRecipient");
    }
  });

  it("Rejects messages that are too long", async () => {
    const longEncryptedData = new Uint8Array(600); // Exceeds MAX_CONTENT_SIZE (500)
    const nonce = new Array(24).fill(0);

    try {
      await program.methods
        .sendMemo(Array.from(longEncryptedData), nonce)
        .accounts({
          sender: sender.publicKey,
          recipient: recipient.publicKey,
          messageAccount: Keypair.generate().publicKey,
          counterAccount: Keypair.generate().publicKey,
          senderIndex: Keypair.generate().publicKey,
          recipientIndex: Keypair.generate().publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.message).to.include("MessageTooLong");
    }
  });

  it("Deletes a message successfully", async () => {
    // First, send a message
    const encryptedData = new Uint8Array(100);
    const nonce = new Array(24).fill(0);

    const [counterPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        Buffer.from("counter"),
        sender.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Get counter value
    let counter = 0;
    try {
      const counterAccount = await program.account.userMessageCounter.fetch(counterPDA);
      counter = counterAccount.counter.toNumber();
    } catch {
      // Counter doesn't exist, use 0
    }

    const [messagePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        sender.publicKey.toBuffer(),
        recipient.publicKey.toBuffer(),
        Buffer.from(counter.toString().padStart(8, '0')),
      ],
      program.programId
    );

    const [senderIndexPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("memo"),
        Buffer.from("index"),
        sender.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Send message first
    await program.methods
      .sendMemo(Array.from(encryptedData), nonce)
      .accounts({
        sender: sender.publicKey,
        recipient: recipient.publicKey,
        messageAccount: messagePDA,
        counterAccount: counterPDA,
        senderIndex: senderIndexPDA,
        recipientIndex: Keypair.generate().publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    // Now delete it
    const deleteTx = await program.methods
      .deleteMemo()
      .accounts({
        sender: sender.publicKey,
        messageAccount: messagePDA,
        senderIndex: senderIndexPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    console.log("Delete transaction:", deleteTx);

    // Verify message is marked as deleted
    const messageAccount = await program.account.messageAccount.fetch(messagePDA);
    expect(messageAccount.deleted).to.be.true;
  });
});

