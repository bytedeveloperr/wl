module wl::dynamic_wl {
    use std::vector;

    use sui::event;
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::dynamic_field;
    use sui::tx_context::TxContext;

    struct Wl has key {
        id: UID
    }

    struct Output has copy, drop {
        is_whitelisted: bool
    }

    struct Key has copy, store, drop { 
        addr: address
    }

    public fun create(addresses: vector<address>, ctx: &mut TxContext): Wl {
        let wl = Wl { 
            id: object::new(ctx)
        };

        while(!vector::is_empty(&addresses)) {
            let addr = vector::pop_back(&mut addresses);
            dynamic_field::add(&mut wl.id, Key { addr }, true)
        };

        wl
    }

    public fun return_and_share(wl: Wl) {
        transfer::share_object(wl)
    }

    public fun is_whitelisted(wl: &Wl, addr: address) {
        let is_whitelisted = dynamic_field::exists_(&wl.id, Key{ addr });
        event::emit(Output { is_whitelisted });
    }
}