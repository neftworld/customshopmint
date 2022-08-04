import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { Customshop } from "../target/types/customshop";
import {
  createMint,
  burn,
  mintToChecked,
  createAssociatedTokenAccount,
  transferChecked,
} from "@solana/spl-token";

const TEST_DOMAIN_1 = "nft.hedgehogasdljfalsdkjfhal.org";

const TEST_DOMAIN_2 = "nft.hedgehog.org";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeid(length) {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

describe("Customshop", async () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.Customshop as Program<Customshop>;

  let originalMinter: Keypair = undefined!;

  describe("given original owner Keypair is funded", async () => {
    beforeEach(async () => {
      originalMinter = Keypair.generate();
      await provider.connection.requestAirdrop(
        originalMinter.publicKey,
        5 * LAMPORTS_PER_SOL
      );

      await sleep(500);
    });

    describe(`given that mint has been created and is owned by the claimant`, async () => {
      let mint: PublicKey | undefined = undefined!;
      let ata: PublicKey = undefined!;
      beforeEach(async () => {
        mint = await createMint(
          provider.connection,
          originalMinter,
          originalMinter.publicKey,
          originalMinter.publicKey,
          0
        );
        await sleep(500);

        ata = await createAssociatedTokenAccount(
          provider.connection, // connection
          originalMinter, // fee payer
          mint, // mint
          originalMinter.publicKey // owner,
        );

        await sleep(500);

        await mintToChecked(
          provider.connection,
          originalMinter,
          mint,
          ata,
          originalMinter,
          1,
          0
        );
        await sleep(500);
      });

      describe("given that we have a testdomain and markerPDA", async () => {
        let testdomain: string = `${makeid(10)}.hedgehog.com`;
        let markerPDA: PublicKey = undefined;
        before(async () => {
          markerPDA = (
            await PublicKey.findProgramAddress(
              [
                anchor.utils.bytes.utf8.encode("marker"),
                anchor.utils.bytes.utf8.encode(testdomain),
              ],
              program.programId
            )
          )[0];
        });

        it("claiming test domain with the mint should succeed", async () => {
          const createMarkerTx = await program.methods
            .createMarker(testdomain)
            .accounts({
              authority: provider.wallet.publicKey,
              owner: originalMinter.publicKey,
              marker: markerPDA,
              mint: mint.toBase58(),
              tokenAccount: ata,
            })
            .signers([originalMinter])
            .rpc();
        });

        it("claiming the same domain for second time should not succeed", async () => {
          await expect(program.methods
              .createMarker(testdomain)
              .accounts({
                authority: provider.wallet.publicKey,
                owner: originalMinter.publicKey,
                marker: markerPDA,
                mint: mint.toBase58(),
                tokenAccount: ata,
              })
              .signers([originalMinter])
              .rpc()).to.throw;
          // }).to.throw(Error);
        });
      });

      // xit("create marker as the claimant should succeed", async () => {});
    });

    // describe("given that the claimant does not hold the mint", async () => {
    //   it("claimant should fail to create a marker", async () => {
    //     const [markerPDA, _] = await PublicKey.findProgramAddress(
    //       [
    //         anchor.utils.bytes.utf8.encode("marker"),
    //         anchor.utils.bytes.utf8.encode(TEST_DOMAIN_2),
    //       ],
    //       program.programId
    //     );

    //     const createMarkerTx = await program.methods
    //       .createMarker(TEST_DOMAIN_2)
    //       .accounts({
    //         authority: provider.wallet.publicKey,
    //         owner: originalMinter.publicKey,
    //         marker: markerPDA,
    //         mint: mint.toBase58(),
    //         tokenAccount,
    //       })
    //       .signers([originalMinter])
    //       .rpc();
    //   });
    // });

    // describe("Given that the claimant holds the mint", async () => {
    //   before(async () => {
    //     let ata = await createAssociatedTokenAccount(
    //       provider.connection, // connection
    //       originalMinter, // fee payer
    //       mint, // mint
    //       originalMinter.publicKey // owner,
    //     );

    //     await mintToChecked(
    //       provider.connection,
    //       originalMinter,
    //       mint,
    //       ata,
    //       originalMinter,
    //       1,
    //       0
    //     );

    //     await sleep(500);
    //   });

    //   describe(`given that claimant has succesfully created a marker`, async () => {
    //     let markerPDA: PublicKey = undefined!;
    //     let testdomain: string = undefined!;

    //     it("marker should have the correct authority", async () => {
    //       expect(
    //         (await program.account.marker.fetch(markerPDA)).authority.toBase58()
    //       ).to.equal(provider.wallet.publicKey.toBase58());
    //     });
    //     it("marker should have the correct owner", async () => {
    //       expect(
    //         (await program.account.marker.fetch(markerPDA)).owner.toBase58()
    //       ).to.equal(originalMinter.publicKey.toBase58());
    //     });

    //     it(`marker should have the correct domain`, async () => {
    //       expect(
    //         (await program.account.marker.fetch(markerPDA)).domain
    //       ).to.equal(testdomain);
    //     });

    //     describe("given that the claimant does not hold the mint", async () => {
    //       /// update owner tests
    //       it("then update owner for existing marker should fail", async () => {
    //         const claimant = Keypair.generate();

    //         const result = await provider.connection.requestAirdrop(
    //           claimant.publicKey,
    //           2 * LAMPORTS_PER_SOL
    //         );

    //         await sleep(500);

    //         console.log({ result });

    //         // const mintKey = Keypair.generate().publicKey;

    //         let mint = await createMint(
    //           provider.connection,
    //           keyPair,
    //           keyPair.publicKey,
    //           keyPair.publicKey,
    //           0
    //         );

    //         const [markerPDA, _] = await PublicKey.findProgramAddress(
    //           [
    //             anchor.utils.bytes.utf8.encode("marker"),
    //             anchor.utils.bytes.utf8.encode(TEST_DOMAIN_2),
    //           ],
    //           program.programId
    //         );

    //         const createMarkerTx = await program.methods
    //           .createMarker(TEST_DOMAIN_2)
    //           .accounts({
    //             authority: provider.wallet.publicKey,
    //             owner: keyPair.publicKey,
    //             marker: markerPDA,
    //             mint: mint.toBase58(),
    //           })
    //           .signers([keyPair])
    //           .rpc();
    //         console.log({ createMarkerTx });

    //         /// ensure that the linked wallet starts off as old creator
    //         expect(
    //           (await program.account.marker.fetch(markerPDA)).owner.toBase58()
    //         ).to.equal(keyPair.publicKey.toBase58());

    //         await sleep(500);

    //         const keyPair2 = Keypair.generate();

    //         const tokenAccount =
    //           await provider.connection.getTokenLargestAccounts(mint);

    //         console.log(JSON.stringify(tokenAccount));

    //         const updateLinkedWalletTx = await program.methods
    //           .updateOwner(TEST_DOMAIN_2)
    //           .accounts({
    //             owner: keyPair2.publicKey,
    //             authority: provider.wallet.publicKey,
    //             marker: markerPDA,
    //             tokenAccount: tokenAccount.value[0].address,
    //           })
    //           .signers([keyPair2])
    //           .rpc();
    //         console.log({ updateLinkedWalletTx });

    //         // await sleep(500);

    //         // /// ensure that authority still matches
    //         // expect(
    //         //   (await program.account.marker.fetch(markerPDA)).authority.toBase58()
    //         // ).to.equal(provider.wallet.publicKey.toBase58());

    //         // /// ensure that the linked wallet has switched over to the new user
    //         // expect(
    //         //   (await program.account.marker.fetch(markerPDA)).owner.toBase58()
    //         // ).to.equal(keyPair2.publicKey.toBase58());

    //         // // /// ensure domain is unchanged
    //         // expect((await program.account.marker.fetch(markerPDA)).domain).to.equal(
    //         //   TEST_DOMAIN_2
    //         // );
    //       });

    //       xit("When owner does hold the token, then update owner for existing marker should succeed", async () => {
    //         const keyPair = Keypair.generate();

    //         const result = await provider.connection.requestAirdrop(
    //           keyPair.publicKey,
    //           2 * LAMPORTS_PER_SOL
    //         );

    //         await sleep(500);

    //         console.log({ result });

    //         // const mintKey = Keypair.generate().publicKey;

    //         let mint = await createMint(
    //           provider.connection,
    //           keyPair,
    //           keyPair.publicKey,
    //           keyPair.publicKey,
    //           0
    //         );

    //         let ata = await createAssociatedTokenAccount(
    //           provider.connection, // connection
    //           keyPair, // fee payer
    //           mint, // mint
    //           keyPair.publicKey // owner,
    //         );

    //         await mintToChecked(
    //           provider.connection,
    //           keyPair,
    //           mint,
    //           ata,
    //           keyPair,
    //           1,
    //           0
    //         );

    //         await sleep(500);

    //         const [markerPDA, _] = await PublicKey.findProgramAddress(
    //           [
    //             anchor.utils.bytes.utf8.encode("marker"),
    //             anchor.utils.bytes.utf8.encode(TEST_DOMAIN_2),
    //           ],
    //           program.programId
    //         );

    //         const createMarkerTx = await program.methods
    //           .createMarker(TEST_DOMAIN_2)
    //           .accounts({
    //             authority: provider.wallet.publicKey,
    //             owner: keyPair.publicKey,
    //             marker: markerPDA,
    //             mint: mint.toBase58(),
    //           })
    //           .signers([keyPair])
    //           .rpc();
    //         console.log({ createMarkerTx });

    //         /// ensure that the linked wallet starts off as old creator
    //         expect(
    //           (await program.account.marker.fetch(markerPDA)).owner.toBase58()
    //         ).to.equal(keyPair.publicKey.toBase58());

    //         await sleep(500);

    //         const keyPair2 = Keypair.generate();

    //         await provider.connection.requestAirdrop(
    //           keyPair2.publicKey,
    //           2 * LAMPORTS_PER_SOL
    //         );
    //         await sleep(500);
    //         /// transfer the token from keyPair -> keyPair2

    //         let newAta = await createAssociatedTokenAccount(
    //           provider.connection, // connection
    //           keyPair2, // fee payer
    //           mint, // mint
    //           keyPair2.publicKey // owner,
    //         );

    //         await transferChecked(
    //           provider.connection,
    //           keyPair2, //payer
    //           ata, // source
    //           mint, // mint
    //           newAta, // destination
    //           keyPair, // owner
    //           1, //amount
    //           0 // decimals
    //         );

    //         await sleep(500);

    //         console.log(JSON.stringify(newAta));

    //         const updateLinkedWalletTx = await program.methods
    //           .updateOwner(TEST_DOMAIN_2)
    //           .accounts({
    //             owner: keyPair2.publicKey,
    //             authority: provider.wallet.publicKey,
    //             marker: markerPDA,
    //             tokenAccount: newAta,
    //           })
    //           .signers([keyPair2])
    //           .rpc();
    //         console.log({ updateLinkedWalletTx });

    //         await sleep(500);

    //         /// ensure that authority still matches
    //         expect(
    //           (
    //             await program.account.marker.fetch(markerPDA)
    //           ).authority.toBase58()
    //         ).to.equal(provider.wallet.publicKey.toBase58());

    //         /// ensure that the linked wallet has switched over to the new user
    //         expect(
    //           (await program.account.marker.fetch(markerPDA)).owner.toBase58()
    //         ).to.equal(keyPair2.publicKey.toBase58());

    //         // /// ensure domain is unchanged
    //         expect(
    //           (await program.account.marker.fetch(markerPDA)).domain
    //         ).to.equal(TEST_DOMAIN_2);
    //       });
    //       describe("When marker exists", async () => {
    //         /// burn marker and mint tests
    //         xit("and owner is the signer, then burn marker and mint should succeed", async () => {
    //           const keyPair = Keypair.generate();

    //           const result = await provider.connection.requestAirdrop(
    //             keyPair.publicKey,
    //             2 * LAMPORTS_PER_SOL
    //           );

    //           await sleep(500);

    //           console.log({ result });

    //           const [markerPDA, _] = await PublicKey.findProgramAddress(
    //             [
    //               anchor.utils.bytes.utf8.encode("marker"),
    //               anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //             ],
    //             program.programId
    //           );

    //           const mint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           const createMarkerTx = await program.methods
    //             .createMarker(TEST_DOMAIN_LONG)
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               linkedWallet: keyPair.publicKey,
    //               marker: markerPDA,
    //               mint: mint.toBase58(),
    //             })
    //             .signers([keyPair])
    //             .rpc();

    //           await sleep(500);

    //           /// ensure that the linked wallet starts off as NOT the  new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.not.equal(keyPair.publicKey.toBase58());

    //           const newMint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           /// should fail since the old mint still exists
    //           const tx = await program.methods
    //             .update_mint()
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               marker: markerPDA,
    //             })
    //             .signers([keyPair])
    //             .rpc();
    //           console.log({ tx });

    //           await sleep(500);

    //           /// ensure that authority still matches
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).authority.toBase58()
    //           ).to.equal(provider.wallet.publicKey.toBase58());

    //           /// ensure created is still true
    //           expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //             true
    //           );

    //           /// ensure that the linked wallet has switched over to the new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.equal(keyPair.publicKey.toBase58());

    //           // /// ensure domain is unchanged
    //           expect(
    //             (await program.account.marker.fetch(markerPDA)).domain
    //           ).to.equal(TEST_DOMAIN_LONG);
    //         });

    //         xit("When owner is not the signer, then burn marker and mint should fail", async () => {
    //           const keyPair = Keypair.generate();

    //           const result = await provider.connection.requestAirdrop(
    //             keyPair.publicKey,
    //             2 * LAMPORTS_PER_SOL
    //           );

    //           await sleep(500);

    //           console.log({ result });

    //           const [markerPDA, _] = await PublicKey.findProgramAddress(
    //             [
    //               anchor.utils.bytes.utf8.encode("marker"),
    //               anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //             ],
    //             program.programId
    //           );

    //           const mint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           const createMarkerTx = await program.methods
    //             .createMarker(TEST_DOMAIN_LONG)
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               linkedWallet: keyPair.publicKey,
    //               marker: markerPDA,
    //               mint: mint.toBase58(),
    //             })
    //             .signers([keyPair])
    //             .rpc();

    //           await sleep(500);

    //           /// ensure that the linked wallet starts off as NOT the  new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.not.equal(keyPair.publicKey.toBase58());

    //           const newMint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           /// should fail since the old mint still exists
    //           const tx = await program.methods
    //             .update_mint()
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               marker: markerPDA,
    //             })
    //             .signers([keyPair])
    //             .rpc();
    //           console.log({ tx });

    //           await sleep(500);

    //           /// ensure that authority still matches
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).authority.toBase58()
    //           ).to.equal(provider.wallet.publicKey.toBase58());

    //           /// ensure created is still true
    //           expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //             true
    //           );

    //           /// ensure that the linked wallet has switched over to the new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.equal(keyPair.publicKey.toBase58());

    //           // /// ensure domain is unchanged
    //           expect(
    //             (await program.account.marker.fetch(markerPDA)).domain
    //           ).to.equal(TEST_DOMAIN_LONG);
    //         });
    //       });

    //       describe("When marker does not exist", async () => {
    //         xit("and when owner is the signer, then burn marker and mint should fail", async () => {
    //           const keyPair = Keypair.generate();

    //           const result = await provider.connection.requestAirdrop(
    //             keyPair.publicKey,
    //             2 * LAMPORTS_PER_SOL
    //           );

    //           await sleep(500);

    //           console.log({ result });

    //           const [markerPDA, _] = await PublicKey.findProgramAddress(
    //             [
    //               anchor.utils.bytes.utf8.encode("marker"),
    //               anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //             ],
    //             program.programId
    //           );

    //           const mint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           const createMarkerTx = await program.methods
    //             .createMarker(TEST_DOMAIN_LONG)
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               linkedWallet: keyPair.publicKey,
    //               marker: markerPDA,
    //               mint: mint.toBase58(),
    //             })
    //             .signers([keyPair])
    //             .rpc();

    //           await sleep(500);

    //           /// ensure that the linked wallet starts off as NOT the  new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.not.equal(keyPair.publicKey.toBase58());

    //           const newMint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           /// should fail since the old mint still exists
    //           const tx = await program.methods
    //             .update_mint()
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               marker: markerPDA,
    //             })
    //             .signers([keyPair])
    //             .rpc();
    //           console.log({ tx });

    //           await sleep(500);

    //           /// ensure that authority still matches
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).authority.toBase58()
    //           ).to.equal(provider.wallet.publicKey.toBase58());

    //           /// ensure created is still true
    //           expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //             true
    //           );

    //           /// ensure that the linked wallet has switched over to the new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.equal(keyPair.publicKey.toBase58());

    //           // /// ensure domain is unchanged
    //           expect(
    //             (await program.account.marker.fetch(markerPDA)).domain
    //           ).to.equal(TEST_DOMAIN_LONG);
    //         });

    //         xit("and when owner is not the signer, then burn marker and mint should fail", async () => {
    //           const keyPair = Keypair.generate();

    //           const result = await provider.connection.requestAirdrop(
    //             keyPair.publicKey,
    //             2 * LAMPORTS_PER_SOL
    //           );

    //           await sleep(500);

    //           console.log({ result });

    //           const [markerPDA, _] = await PublicKey.findProgramAddress(
    //             [
    //               anchor.utils.bytes.utf8.encode("marker"),
    //               anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //             ],
    //             program.programId
    //           );

    //           const mint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           const createMarkerTx = await program.methods
    //             .createMarker(TEST_DOMAIN_LONG)
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               linkedWallet: keyPair.publicKey,
    //               marker: markerPDA,
    //               mint: mint.toBase58(),
    //             })
    //             .signers([keyPair])
    //             .rpc();

    //           await sleep(500);

    //           /// ensure that the linked wallet starts off as NOT the  new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.not.equal(keyPair.publicKey.toBase58());

    //           const newMint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           /// should fail since the old mint still exists
    //           const tx = await program.methods
    //             .update_mint()
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               marker: markerPDA,
    //             })
    //             .signers([keyPair])
    //             .rpc();
    //           console.log({ tx });

    //           await sleep(500);

    //           /// ensure that authority still matches
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).authority.toBase58()
    //           ).to.equal(provider.wallet.publicKey.toBase58());

    //           /// ensure created is still true
    //           expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //             true
    //           );

    //           /// ensure that the linked wallet has switched over to the new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.equal(keyPair.publicKey.toBase58());

    //           // /// ensure domain is unchanged
    //           expect(
    //             (await program.account.marker.fetch(markerPDA)).domain
    //           ).to.equal(TEST_DOMAIN_LONG);
    //         });
    //       });

    //       describe("Burn marker only", async () => {
    //         /// burn marker tests
    //         xit("When owner is the signer, then burn marker should fail", async () => {
    //           const keyPair = Keypair.generate();

    //           const result = await provider.connection.requestAirdrop(
    //             keyPair.publicKey,
    //             2 * LAMPORTS_PER_SOL
    //           );

    //           await sleep(500);

    //           console.log({ result });

    //           const [markerPDA, _] = await PublicKey.findProgramAddress(
    //             [
    //               anchor.utils.bytes.utf8.encode("marker"),
    //               anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //             ],
    //             program.programId
    //           );

    //           const mint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           const createMarkerTx = await program.methods
    //             .createMarker(TEST_DOMAIN_LONG)
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               linkedWallet: keyPair.publicKey,
    //               marker: markerPDA,
    //               mint: mint.toBase58(),
    //             })
    //             .signers([keyPair])
    //             .rpc();

    //           await sleep(500);

    //           /// ensure that the linked wallet starts off as NOT the  new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.not.equal(keyPair.publicKey.toBase58());

    //           const newMint = await createMint(
    //             provider.connection,
    //             keyPair,
    //             Keypair.generate().publicKey,
    //             Keypair.generate().publicKey,
    //             0
    //           );

    //           await sleep(500);

    //           /// should fail since the old mint still exists
    //           const tx = await program.methods
    //             .update_mint()
    //             .accounts({
    //               authority: provider.wallet.publicKey,
    //               marker: markerPDA,
    //             })
    //             .signers([keyPair])
    //             .rpc();
    //           console.log({ tx });

    //           await sleep(500);

    //           /// ensure that authority still matches
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).authority.toBase58()
    //           ).to.equal(provider.wallet.publicKey.toBase58());

    //           /// ensure created is still true
    //           expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //             true
    //           );

    //           /// ensure that the linked wallet has switched over to the new user
    //           expect(
    //             (
    //               await program.account.marker.fetch(markerPDA)
    //             ).linkedWallet.toBase58()
    //           ).to.equal(keyPair.publicKey.toBase58());

    //           // /// ensure domain is unchanged
    //           expect(
    //             (await program.account.marker.fetch(markerPDA)).domain
    //           ).to.equal(TEST_DOMAIN_LONG);
    //         });
    //         describe("When authority is the signer", async () => {
    //           xit("and mint exists, then burn marker should fail", async () => {
    //             const keyPair = Keypair.generate();

    //             const result = await provider.connection.requestAirdrop(
    //               keyPair.publicKey,
    //               2 * LAMPORTS_PER_SOL
    //             );

    //             await sleep(500);

    //             console.log({ result });

    //             const [markerPDA, _] = await PublicKey.findProgramAddress(
    //               [
    //                 anchor.utils.bytes.utf8.encode("marker"),
    //                 anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //               ],
    //               program.programId
    //             );

    //             const mint = await createMint(
    //               provider.connection,
    //               keyPair,
    //               Keypair.generate().publicKey,
    //               Keypair.generate().publicKey,
    //               0
    //             );

    //             await sleep(500);

    //             const createMarkerTx = await program.methods
    //               .createMarker(TEST_DOMAIN_LONG)
    //               .accounts({
    //                 authority: provider.wallet.publicKey,
    //                 linkedWallet: keyPair.publicKey,
    //                 marker: markerPDA,
    //                 mint: mint.toBase58(),
    //               })
    //               .signers([keyPair])
    //               .rpc();

    //             await sleep(500);

    //             /// ensure that the linked wallet starts off as NOT the  new user
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).linkedWallet.toBase58()
    //             ).to.not.equal(keyPair.publicKey.toBase58());

    //             const newMint = await createMint(
    //               provider.connection,
    //               keyPair,
    //               Keypair.generate().publicKey,
    //               Keypair.generate().publicKey,
    //               0
    //             );

    //             await sleep(500);

    //             /// should fail since the old mint still exists
    //             const tx = await program.methods
    //               .update_mint()
    //               .accounts({
    //                 authority: provider.wallet.publicKey,
    //                 marker: markerPDA,
    //               })
    //               .signers([keyPair])
    //               .rpc();
    //             console.log({ tx });

    //             await sleep(500);

    //             /// ensure that authority still matches
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).authority.toBase58()
    //             ).to.equal(provider.wallet.publicKey.toBase58());

    //             /// ensure created is still true
    //             expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //               true
    //             );

    //             /// ensure that the linked wallet has switched over to the new user
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).linkedWallet.toBase58()
    //             ).to.equal(keyPair.publicKey.toBase58());

    //             // /// ensure domain is unchanged
    //             expect(
    //               (await program.account.marker.fetch(markerPDA)).domain
    //             ).to.equal(TEST_DOMAIN_LONG);
    //           });

    //           xit("and mint does not exist, then burn marker should success", async () => {
    //             const keyPair = Keypair.generate();

    //             const result = await provider.connection.requestAirdrop(
    //               keyPair.publicKey,
    //               2 * LAMPORTS_PER_SOL
    //             );

    //             await sleep(500);

    //             console.log({ result });

    //             const [markerPDA, _] = await PublicKey.findProgramAddress(
    //               [
    //                 anchor.utils.bytes.utf8.encode("marker"),
    //                 anchor.utils.bytes.utf8.encode(TEST_DOMAIN_LONG),
    //               ],
    //               program.programId
    //             );

    //             const mint = await createMint(
    //               provider.connection,
    //               keyPair,
    //               Keypair.generate().publicKey,
    //               Keypair.generate().publicKey,
    //               0
    //             );

    //             await sleep(500);

    //             const createMarkerTx = await program.methods
    //               .createMarker(TEST_DOMAIN_LONG)
    //               .accounts({
    //                 authority: provider.wallet.publicKey,
    //                 linkedWallet: keyPair.publicKey,
    //                 marker: markerPDA,
    //                 mint: mint.toBase58(),
    //               })
    //               .signers([keyPair])
    //               .rpc();

    //             await sleep(500);

    //             /// ensure that the linked wallet starts off as NOT the  new user
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).linkedWallet.toBase58()
    //             ).to.not.equal(keyPair.publicKey.toBase58());

    //             const newMint = await createMint(
    //               provider.connection,
    //               keyPair,
    //               Keypair.generate().publicKey,
    //               Keypair.generate().publicKey,
    //               0
    //             );

    //             await sleep(500);

    //             /// should fail since the old mint still exists
    //             const tx = await program.methods
    //               .update_mint()
    //               .accounts({
    //                 authority: provider.wallet.publicKey,
    //                 marker: markerPDA,
    //               })
    //               .signers([keyPair])
    //               .rpc();
    //             console.log({ tx });

    //             await sleep(500);

    //             /// ensure that authority still matches
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).authority.toBase58()
    //             ).to.equal(provider.wallet.publicKey.toBase58());

    //             /// ensure created is still true
    //             expect(await program.account.marker.fetch(markerPDA)).to.equal(
    //               true
    //             );

    //             /// ensure that the linked wallet has switched over to the new user
    //             expect(
    //               (
    //                 await program.account.marker.fetch(markerPDA)
    //               ).linkedWallet.toBase58()
    //             ).to.equal(keyPair.publicKey.toBase58());

    //             // /// ensure domain is unchanged
    //             expect(
    //               (await program.account.marker.fetch(markerPDA)).domain
    //             ).to.equal(TEST_DOMAIN_LONG);
    //           });
    //         });
    //       });
    //     });
    //   });
    // });
  });
});
