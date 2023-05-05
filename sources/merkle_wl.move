module wl::merkle_wl {
    use std::vector;

    use sui::bcs;
    use sui::hash;
    use sui::event;
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    const EINVALID_BYTES_LENGTH: u64 = 0;

    struct Wl has key {
        id: UID,
        merkle_root: vector<u8>
    }

    struct Output has copy, drop {
        is_whitelisted: bool
    }

    struct Key has copy, store, drop { 
        addr: address 
    }

    public fun create(merkle_root: vector<u8>, ctx: &mut TxContext): Wl {
        Wl { 
            id: object::new(ctx),
            merkle_root
        }
    }

    public fun return_and_share(wl: Wl) {
        transfer::share_object(wl)
    }

    public fun is_whitelisted(wl: &Wl, proof: vector<vector<u8>>, positions: vector<u8>, addr: address) {
        let leaf = bcs::to_bytes(&addr);
        let is_whitelisted = verify(proof, positions, wl.merkle_root, hash::keccak256(&leaf));

        event::emit(Output { is_whitelisted });
    }

    fun verify(proof: vector<vector<u8>>, positions: vector<u8>, root: vector<u8>, leaf: vector<u8>): bool {
        assert!(vector::length(&root) == 32, EINVALID_BYTES_LENGTH);
        assert!(vector::length(&leaf) == 32, EINVALID_BYTES_LENGTH);

        let (i, proof_len, current_hash) = (0, vector::length(&proof), leaf);
        while (i < proof_len) {
            let position = *vector::borrow(&positions, i);
            let proof_hash = *vector::borrow_mut(&mut proof, i);

            if (position == 1) {
                vector::append(&mut current_hash, proof_hash);
                current_hash = hash::keccak256(&current_hash)
            } else {
                vector::append(&mut proof_hash, current_hash);
                current_hash = hash::keccak256(&proof_hash)
            };

            i = i + 1
        };

        current_hash == root
    }
}