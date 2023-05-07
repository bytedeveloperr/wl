module wl::vector_wl {
    use std::vector;

    use sui::event;
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    struct Wl has key {
        id: UID,
        addresses: vector<address>
    }

    struct Output has copy, drop {
        is_whitelisted: bool
    }

    public fun create(addresses: vector<address>, ctx: &mut TxContext): Wl {
        Wl { 
            id: object::new(ctx), 
            addresses
        }
    }
    
    public fun return_and_share(wl: Wl) {
        transfer::share_object(wl)
    }

    public fun is_whitelisted(wl: &Wl, addr: address) {
        let is_whitelisted = vector::contains(&wl.addresses, &addr);
        event::emit(Output { is_whitelisted });
    }
}